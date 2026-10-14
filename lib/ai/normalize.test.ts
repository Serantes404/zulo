import { describe, it, expect } from 'vitest';
import { normalizeZones, MAX_ZONES, type Zone } from './normalize';

const img = { width: 2000, height: 1000 };

function expectZone(z: Zone, e: Zone) {
  expect(z.label).toBe(e.label);
  (['x', 'y', 'w', 'h'] as const).forEach((k) => expect(z[k]).toBeCloseTo(e[k], 6));
}

describe('normalizeZones', () => {
  it('convierte relative1000 a 0-1', () => {
    const [z] = normalizeZones([{ label: 'Cuerdas', box: [100, 200, 500, 600] }], 'relative1000', img);
    expectZone(z, { label: 'Cuerdas', x: 0.1, y: 0.2, w: 0.4, h: 0.4 });
  });

  it('convierte píxeles usando el tamaño de la imagen', () => {
    const [z] = normalizeZones([{ label: 'Tiendas', box: [200, 100, 1000, 500] }], 'pixels', img);
    expectZone(z, { label: 'Tiendas', x: 0.1, y: 0.1, w: 0.4, h: 0.4 });
  });

  it('acepta esquinas invertidas', () => {
    const [z] = normalizeZones([{ label: 'A', box: [500, 600, 100, 200] }], 'relative1000', img);
    expectZone(z, { label: 'A', x: 0.1, y: 0.2, w: 0.4, h: 0.4 });
  });

  it('recorta coordenadas fuera de rango', () => {
    const [z] = normalizeZones([{ label: 'B', box: [-50, -50, 1200, 500] }], 'relative1000', img);
    expectZone(z, { label: 'B', x: 0, y: 0, w: 1, h: 0.5 });
  });

  it('descarta cajas con área menor del 1 %', () => {
    expect(normalizeZones([{ label: 'C', box: [0, 0, 50, 50] }], 'relative1000', img)).toEqual([]);
  });

  it(`limita a ${MAX_ZONES} zonas`, () => {
    const raw = Array.from({ length: 40 }, () => ({ label: 'D', box: [0, 0, 500, 500] as [number, number, number, number] }));
    expect(normalizeZones(raw, 'relative1000', img)).toHaveLength(MAX_ZONES);
  });

  it('pone "Zona N" a las zonas sin etiqueta', () => {
    const box: [number, number, number, number] = [0, 0, 500, 500];
    const r = normalizeZones(
      [{ label: '  ', box }, { label: 'Tiendas', box }, { label: '', box }],
      'relative1000',
      img,
    );
    expect(r.map((z) => z.label)).toEqual(['Zona 1', 'Tiendas', 'Zona 3']);
  });
});
