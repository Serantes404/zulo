import { describe, it, expect } from 'vitest';
import { wallSegments, doorSwing } from './floorPlanGeometry';
import type { Door } from './layout';

describe('wallSegments', () => {
  it('sin puertas, la pared es entera', () => expect(wallSegments('left', [])).toEqual([[0, 1]]));
  it('deja un hueco donde está la puerta', () =>
    expect(wallSegments('left', [{ wall: 'left', start: 0.4, end: 0.5 }])).toEqual([[0, 0.4], [0.5, 1]]));
  it('ignora las puertas de otras paredes', () =>
    expect(wallSegments('top', [{ wall: 'left', start: 0.4, end: 0.5 }])).toEqual([[0, 1]]));
  it('une puertas que se solapan y no crea tramos vacíos en los extremos', () =>
    expect(
      wallSegments('bottom', [
        { wall: 'bottom', start: 0, end: 0.2 },
        { wall: 'bottom', start: 0.15, end: 0.3 },
        { wall: 'bottom', start: 0.9, end: 1 },
      ]),
    ).toEqual([[0.3, 0.9]]));
});

describe('doorSwing', () => {
  const W = 1000;
  const H = 500;
  it('puerta en la pared izquierda: pivota en start y abre hacia dentro', () => {
    const d: Door = { wall: 'left', start: 0.2, end: 0.4 };
    expect(doorSwing(d, W, H)).toEqual({
      hinge: { x: 0, y: 100 },
      leafEnd: { x: 100, y: 100 },
      arcEnd: { x: 0, y: 200 },
      radius: 100,
      sweep: 1,
    });
  });
  it('puerta en la pared inferior', () => {
    const d: Door = { wall: 'bottom', start: 0.5, end: 0.75 };
    expect(doorSwing(d, W, H)).toEqual({
      hinge: { x: 500, y: 500 },
      leafEnd: { x: 500, y: 250 },
      arcEnd: { x: 750, y: 500 },
      radius: 250,
      sweep: 1,
    });
  });
  it('las puertas de arriba y de la derecha giran en sentido contrario', () => {
    expect(doorSwing({ wall: 'top', start: 0.1, end: 0.2 }, W, H).sweep).toBe(0);
    expect(doorSwing({ wall: 'right', start: 0.1, end: 0.2 }, W, H).sweep).toBe(0);
  });
});
