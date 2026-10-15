// Boceto del plano dibujado en la app: lista de trazos con puntos en 0-1 (independiente del tamaño del lienzo).
export type Point = { x: number; y: number };
export type Sketch = Point[][];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clampPoint = (p: Point): Point => ({ x: clamp01(p.x), y: clamp01(p.y) });

export function startStroke(s: Sketch, p: Point): Sketch {
  return [...s, [clampPoint(p)]];
}

export function extendStroke(s: Sketch, p: Point): Sketch {
  if (s.length === 0) return s;
  return [...s.slice(0, -1), [...s[s.length - 1], clampPoint(p)]];
}

export function undo(s: Sketch): Sketch {
  return s.slice(0, -1);
}

export function isEmpty(s: Sketch): boolean {
  return s.length === 0;
}
