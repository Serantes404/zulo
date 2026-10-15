import { describe, it, expect } from 'vitest';
import { startStroke, extendStroke, undo, isEmpty, type Sketch } from './sketch';

describe('sketch', () => {
  it('empieza vacío', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('startStroke añade un trazo nuevo con su primer punto', () => {
    const s = startStroke([], { x: 0.1, y: 0.2 });
    expect(s).toEqual([[{ x: 0.1, y: 0.2 }]]);
    expect(isEmpty(s)).toBe(false);
  });

  it('extendStroke añade el punto al último trazo sin tocar los anteriores', () => {
    let s: Sketch = startStroke([], { x: 0, y: 0 });
    s = startStroke(s, { x: 0.5, y: 0.5 });
    s = extendStroke(s, { x: 0.6, y: 0.6 });
    expect(s).toEqual([[{ x: 0, y: 0 }], [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 }]]);
  });

  it('extendStroke no hace nada si no hay trazos', () => {
    expect(extendStroke([], { x: 0.5, y: 0.5 })).toEqual([]);
  });

  it('recorta los puntos al rango 0-1', () => {
    const s = extendStroke(startStroke([], { x: -0.2, y: 1.3 }), { x: 2, y: -1 });
    expect(s).toEqual([[{ x: 0, y: 1 }, { x: 1, y: 0 }]]);
  });

  it('undo quita el último trazo', () => {
    const s = startStroke(startStroke([], { x: 0, y: 0 }), { x: 1, y: 1 });
    expect(undo(s)).toEqual([[{ x: 0, y: 0 }]]);
    expect(undo([])).toEqual([]);
  });

  it('no modifica el boceto original', () => {
    const s: Sketch = [[{ x: 0, y: 0 }]];
    extendStroke(s, { x: 1, y: 1 });
    startStroke(s, { x: 1, y: 1 });
    expect(s).toEqual([[{ x: 0, y: 0 }]]);
  });
});
