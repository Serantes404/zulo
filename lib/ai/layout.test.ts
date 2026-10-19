import { describe, it, expect } from 'vitest';
import { normalizeSketch } from './layout';

const img = { width: 1000, height: 1000 };
const full = { box_2d: [0, 0, 1000, 1000] };
const json = (o: object) => JSON.stringify({ room: full, doors: [], corridors: [], zones: [], ...o });

describe('normalizeSketch', () => {
  it('convierte las zonas a coordenadas de la sala', () => {
    const r = normalizeSketch(
      json({ room: { box_2d: [100, 200, 900, 800] }, zones: [{ label: 'Menaje', box_2d: [100, 200, 500, 500] }] }),
      img,
    )!;
    expect(r.zones[0].label).toBe('Menaje');
    expect(r.zones[0].x).toBeCloseTo(0);
    expect(r.zones[0].y).toBeCloseTo(0);
    expect(r.zones[0].w).toBeCloseTo(0.5);
    expect(r.zones[0].h).toBeCloseTo(0.5);
    expect(r.aspectRatio).toBeCloseTo(600 / 800);
  });

  it('usa la imagen entera si la sala no es válida o es diminuta', () => {
    for (const room of [undefined, { box_2d: [500, 500, 510, 510] }, { box_2d: 'x' }]) {
      const r = normalizeSketch(json({ room, zones: [{ label: 'A', box_2d: [0, 0, 500, 500] }] }), img)!;
      expect(r.zones[0].w).toBeCloseTo(0.5);
      expect(r.aspectRatio).toBeCloseTo(1);
    }
  });

  it('convierte una zona "Puerta" en puerta de la pared más cercana', () => {
    const r = normalizeSketch(
      json({ zones: [{ label: 'Menaje', box_2d: [0, 0, 300, 300] }, { label: 'Puerta', box_2d: [700, 0, 800, 100] }] }),
      img,
    )!;
    expect(r.zones.map((z) => z.label)).toEqual(['Menaje']);
    expect(r.layout.doors).toHaveLength(1);
    expect(r.layout.doors[0].wall).toBe('left');
    expect(r.layout.doors[0].start).toBeCloseTo(0.7);
    expect(r.layout.doors[0].end).toBeCloseTo(0.8);
  });

  it('no duplica la puerta si la IA ya la puso en esa pared', () => {
    const r = normalizeSketch(
      json({
        doors: [{ wall: 'left', start: 700, end: 800 }],
        zones: [{ label: 'A', box_2d: [0, 0, 300, 300] }, { label: 'ENTRADA', box_2d: [700, 0, 800, 100] }],
      }),
      img,
    )!;
    expect(r.layout.doors).toHaveLength(1);
  });

  it('normaliza puertas invertidas, estrechas o fuera de la sala y descarta paredes desconocidas', () => {
    const r = normalizeSketch(
      json({
        doors: [
          { wall: 'left', start: 900, end: 850 },
          { wall: 'bottom', start: 990, end: 1200 },
          { wall: 'techo', start: 100, end: 200 },
        ],
        zones: [{ label: 'A', box_2d: [0, 0, 300, 300] }],
      }),
      img,
    )!;
    expect(r.layout.doors).toHaveLength(2);
    const [left, bottom] = r.layout.doors;
    expect(left.end - left.start).toBeCloseTo(0.06);
    expect((left.start + left.end) / 2).toBeCloseTo(0.875);
    expect(bottom.end).toBeLessThanOrEqual(1);
    expect(bottom.end - bottom.start).toBeCloseTo(0.06);
  });

  it('descarta pasillos que tapan una zona y pone "Pasillo" si no tienen nombre', () => {
    const r = normalizeSketch(
      json({
        zones: [{ label: 'A', box_2d: [0, 0, 1000, 300] }],
        corridors: [
          { label: '', box_2d: [0, 350, 1000, 650] },
          { label: 'Otro', box_2d: [0, 100, 1000, 400] },
        ],
      }),
      img,
    )!;
    expect(r.layout.corridors).toHaveLength(1);
    expect(r.layout.corridors[0].label).toBe('Pasillo');
    expect(r.layout.corridors[0].x).toBeCloseTo(0.35);
  });

  it('limita la proporción de la sala a 0.25-4', () => {
    expect(normalizeSketch(json({ zones: [{ label: 'A', box_2d: [0, 0, 500, 500] }] }), { width: 8000, height: 1000 })!.aspectRatio).toBe(4);
    expect(normalizeSketch(json({ zones: [{ label: 'A', box_2d: [0, 0, 500, 500] }] }), { width: 1000, height: 8000 })!.aspectRatio).toBe(0.25);
  });

  it('pone "Zona N" a las zonas sin nombre', () => {
    const r = normalizeSketch(json({ zones: [{ label: '', box_2d: [0, 0, 300, 300] }] }), img)!;
    expect(r.zones[0].label).toBe('Zona 1');
  });

  it('devuelve null si no es JSON o no tiene zonas', () => {
    expect(normalizeSketch('basura', img)).toBeNull();
    expect(normalizeSketch('{"room":{}}', img)).toBeNull();
  });
});
