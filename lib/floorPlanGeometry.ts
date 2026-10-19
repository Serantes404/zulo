import type { Door, Wall } from './layout';

export type Pt = { x: number; y: number };

/** Tramos macizos de una pared (0-1 a lo largo de ella) que quedan entre sus puertas. */
export function wallSegments(wall: Wall, doors: Door[]): Array<[number, number]> {
  const gaps = doors
    .filter((d) => d.wall === wall)
    .map((d) => [d.start, d.end] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  let cur = 0;
  for (const [s, e] of gaps) {
    if (s > cur) out.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < 1) out.push([cur, 1]);
  return out;
}

/**
 * Hoja y arco de una puerta en coordenadas del viewBox (W × H). Pivota en `start` y abre hacia dentro.
 * `sweep` es el sweep-flag del arco SVG: 1 = el ángulo crece (sentido horario en pantalla).
 */
export function doorSwing(door: Door, W: number, H: number) {
  const along = door.wall === 'top' || door.wall === 'bottom' ? W : H;
  const radius = (door.end - door.start) * along;
  const s = door.start;
  const e = door.end;
  switch (door.wall) {
    case 'top':
      return { hinge: { x: s * W, y: 0 }, leafEnd: { x: s * W, y: radius }, arcEnd: { x: e * W, y: 0 }, radius, sweep: 0 as const };
    case 'bottom':
      return { hinge: { x: s * W, y: H }, leafEnd: { x: s * W, y: H - radius }, arcEnd: { x: e * W, y: H }, radius, sweep: 1 as const };
    case 'left':
      return { hinge: { x: 0, y: s * H }, leafEnd: { x: radius, y: s * H }, arcEnd: { x: 0, y: e * H }, radius, sweep: 1 as const };
    case 'right':
      return { hinge: { x: W, y: s * H }, leafEnd: { x: W - radius, y: s * H }, arcEnd: { x: W, y: e * H }, radius, sweep: 0 as const };
  }
}
