export type BoxFormat = 'relative1000' | 'pixels';
export type RawZone = { label: string; box: [number, number, number, number] };
export type Zone = { label: string; x: number; y: number; w: number; h: number };

export const MAX_ZONES = 30;
/** Máximo de caracteres del nombre de una zona (lo mismo que exige validateZones al guardar). */
export const MAX_LABEL = 60;
export const MIN_AREA = 0.01;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function normalizeZones(
  raw: RawZone[],
  format: BoxFormat,
  img: { width: number; height: number },
): Zone[] {
  const sx = format === 'relative1000' ? 1000 : img.width;
  const sy = format === 'relative1000' ? 1000 : img.height;
  const zones: Zone[] = [];
  for (const r of raw) {
    const [a, b, c, d] = r.box;
    const x1 = clamp01(Math.min(a, c) / sx);
    const x2 = clamp01(Math.max(a, c) / sx);
    const y1 = clamp01(Math.min(b, d) / sy);
    const y2 = clamp01(Math.max(b, d) / sy);
    const w = x2 - x1;
    const h = y2 - y1;
    if (w * h < MIN_AREA) continue;
    zones.push({ label: r.label.trim().slice(0, MAX_LABEL).trim(), x: x1, y: y1, w, h });
  }
  return zones.slice(0, MAX_ZONES).map((z, i) => ({ ...z, label: z.label || `Zona ${i + 1}` }));
}
