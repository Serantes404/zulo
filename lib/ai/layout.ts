import { z } from 'zod';
import { normalizeZones, type RawZone, type Zone } from './normalize';
import { MAX_ASPECT, MIN_ASPECT, type Corridor, type Door, type Layout, type Wall } from '@/lib/layout';

// Respuesta de Gemini en modo sketch -> plano en coordenadas 0-1 relativas a la sala.
// box_2d = [ymin, xmin, ymax, xmax] en 0-1000 sobre la imagen (formato nativo de Gemini).
export type SketchPlan = { zones: Zone[]; layout: Layout; aspectRatio: number };

export const MIN_DOOR = 0.06;
export const MAX_DOOR = 0.4;
export const MAX_CORRIDOR_OVERLAP = 0.2;
const MIN_ROOM_AREA = 0.1; // fracción de la imagen
const MIN_CORRIDOR_AREA = 0.01;
const WALL_NAMES = ['top', 'bottom', 'left', 'right'] as const;
const DOOR_WORDS = new Set(['puerta', 'entrada', 'door']);

const box = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const named = z.object({ label: z.string().catch(''), box_2d: box });
const doorSchema = z.object({ wall: z.enum(WALL_NAMES), start: z.number(), end: z.number() });
const top = z.object({
  room: z.object({ box_2d: box }).nullish().catch(null),
  doors: z.array(z.unknown()).catch([]),
  corridors: z.array(z.unknown()).catch([]),
  zones: z.array(z.unknown()),
});

type Rect = { x: number; y: number; w: number; h: number };
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const each = <T>(schema: z.ZodType<T>, list: unknown[]): T[] =>
  list.flatMap((v) => {
    const r = schema.safeParse(v);
    return r.success ? [r.data] : [];
  });

function overlapRatio(a: Rect, b: Rect): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return b.w * b.h > 0 ? (ix * iy) / (b.w * b.h) : 0;
}

/** Ajusta el ancho de una puerta a MIN_DOOR-MAX_DOOR alrededor de su centro, dentro de la pared. */
function fixDoor(wall: Wall, a: number, b: number): Door {
  const s0 = clamp01(Math.min(a, b));
  const e0 = clamp01(Math.max(a, b));
  const width = Math.min(MAX_DOOR, Math.max(MIN_DOOR, e0 - s0));
  const center = Math.min(1 - width / 2, Math.max(width / 2, (s0 + e0) / 2));
  return { wall, start: center - width / 2, end: center + width / 2 };
}

/** Puerta en la pared más cercana a un rectángulo (para zonas que la IA etiquetó "Puerta"). */
function doorFromRect(r: Rect): Door {
  const dist: Record<Wall, number> = { left: r.x, right: 1 - (r.x + r.w), top: r.y, bottom: 1 - (r.y + r.h) };
  const wall = (Object.keys(dist) as Wall[]).reduce((m, k) => (dist[k] < dist[m] ? k : m));
  return wall === 'left' || wall === 'right' ? fixDoor(wall, r.y, r.y + r.h) : fixDoor(wall, r.x, r.x + r.w);
}

export function normalizeSketch(content: string, img: { width: number; height: number }): SketchPlan | null {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }
  const parsed = top.safeParse(data);
  if (!parsed.success) return null;
  const p = parsed.data;

  // Sala en 0-1000 sobre la imagen; si no vale, la imagen entera.
  let [ry1, rx1, ry2, rx2] = [0, 0, 1000, 1000];
  if (p.room) {
    const [a, b, c, d] = p.room.box_2d;
    const [y1, y2, x1, x2] = [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)].map((n) =>
      Math.min(1000, Math.max(0, n)),
    );
    if ((x2 - x1) * (y2 - y1) >= MIN_ROOM_AREA * 1e6) [ry1, rx1, ry2, rx2] = [y1, x1, y2, x2];
  }
  const rw = rx2 - rx1;
  const rh = ry2 - ry1;
  const toRoom = ([a, b, c, d]: [number, number, number, number]): Rect => {
    const x1 = clamp01((Math.min(b, d) - rx1) / rw);
    const x2 = clamp01((Math.max(b, d) - rx1) / rw);
    const y1 = clamp01((Math.min(a, c) - ry1) / rh);
    const y2 = clamp01((Math.max(a, c) - ry1) / rh);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };

  const doors: Door[] = each(doorSchema, p.doors).map((d) =>
    d.wall === 'left' || d.wall === 'right'
      ? fixDoor(d.wall, (d.start - ry1) / rh, (d.end - ry1) / rh)
      : fixDoor(d.wall, (d.start - rx1) / rw, (d.end - rx1) / rw),
  );

  const raw: RawZone[] = [];
  for (const z of each(named, p.zones)) {
    const r = toRoom(z.box_2d);
    if (DOOR_WORDS.has(fold(z.label))) {
      const door = doorFromRect(r);
      if (!doors.some((d) => d.wall === door.wall)) doors.push(door);
      continue;
    }
    raw.push({ label: z.label, box: [r.x * 1000, r.y * 1000, (r.x + r.w) * 1000, (r.y + r.h) * 1000] });
  }
  const zones = normalizeZones(raw, 'relative1000', { width: 1, height: 1 });
  if (zones.length === 0) return null;

  const corridors: Corridor[] = each(named, p.corridors)
    .map((c) => ({ label: c.label.trim().slice(0, 40) || 'Pasillo', ...toRoom(c.box_2d) }))
    .filter((c) => c.w * c.h >= MIN_CORRIDOR_AREA)
    .filter((c) => !zones.some((z) => overlapRatio(c, z) > MAX_CORRIDOR_OVERLAP))
    .slice(0, 6);

  const aspect = (rw * img.width) / (rh * img.height);
  return {
    zones,
    layout: { doors: doors.slice(0, 8), corridors },
    aspectRatio: Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect)),
  };
}
