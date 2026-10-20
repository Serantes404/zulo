// Alternativa de teclado al arrastre del editor de zonas (WCAG 2.1.1). Coordenadas normalizadas 0-1.
import { clampZone, type EditableZone } from './zones';

export const NUDGE = 0.02;
export const NUDGE_BIG = 0.1;

export type ZoneNudge = { kind: 'move' | 'resize'; dx: number; dy: number };

const DIRS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Flechas: mover. Alt + flechas: tamaño (derecha/abajo crecen). Mayús: pasos grandes. */
export function zoneKeyAction(key: string, mods: { shift?: boolean; alt?: boolean }): ZoneNudge | null {
  const dir = DIRS[key];
  if (!dir) return null;
  const step = mods.shift ? NUDGE_BIG : NUDGE;
  return { kind: mods.alt ? 'resize' : 'move', dx: dir[0] * step, dy: dir[1] * step };
}

/** Aplica el ajuste y deja la zona dentro del plano (clampZone). La esquina superior izquierda queda fija al cambiar el tamaño. */
export function nudgeZone(z: EditableZone, n: ZoneNudge): EditableZone {
  return n.kind === 'move'
    ? clampZone({ ...z, x: z.x + n.dx, y: z.y + n.dy })
    : clampZone({ ...z, w: z.w + n.dx, h: z.h + n.dy });
}
