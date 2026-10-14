import { describe, it, expect } from 'vitest';
import { PALETTE, MIN_SIZE, fromDetected, newZone, clampZone, validateZones, type EditableZone } from './zones';

let n = 0;
const key = () => `k${++n}`;
const base: EditableZone = { key: 'a', label: 'Tiendas', color: PALETTE[0], x: 0.1, y: 0.1, w: 0.3, h: 0.3 };

describe('fromDetected', () => {
  it('asigna clave y colores de la paleta en orden', () => {
    const r = fromDetected(
      [
        { label: 'A', x: 0, y: 0, w: 0.5, h: 0.5 },
        { label: 'B', x: 0.5, y: 0, w: 0.5, h: 0.5 },
      ],
      key,
    );
    expect(r.map((z) => z.color)).toEqual([PALETTE[0], PALETTE[1]]);
    expect(r[0].key).not.toBe(r[1].key);
    expect(r[0].id).toBeUndefined();
  });
});

describe('newZone', () => {
  it('crea "Zona N" centrada', () => {
    expect(newZone(2, () => 'x')).toEqual({ key: 'x', label: 'Zona 3', color: PALETTE[2], x: 0.4, y: 0.4, w: 0.2, h: 0.2 });
  });
});

describe('clampZone', () => {
  it('mantiene la zona dentro del plano', () => {
    const z = clampZone({ ...base, x: 0.9, y: -0.2, w: 0.3, h: 0.3 });
    expect(z.x).toBeCloseTo(0.7);
    expect(z.y).toBe(0);
  });
  it('impone un tamaño mínimo', () => {
    const z = clampZone({ ...base, w: 0, h: 0.001 });
    expect(z.w).toBe(MIN_SIZE);
    expect(z.h).toBe(MIN_SIZE);
  });
});

describe('validateZones', () => {
  it('acepta zonas correctas', () => expect(validateZones([base])).toBeNull());
  it('rechaza nombres vacíos', () => expect(validateZones([{ ...base, label: '  ' }])).toMatch(/nombre/));
  it('rechaza nombres de más de 60 caracteres', () => expect(validateZones([{ ...base, label: 'a'.repeat(61) }])).toMatch(/60/));
  it('rechaza más de 30 zonas', () => expect(validateZones(Array.from({ length: 31 }, () => base))).toMatch(/30/));
  it('rechaza colores fuera de la paleta', () => expect(validateZones([{ ...base, color: '#000000' }])).toMatch(/Color/));
  it('rechaza posiciones no numéricas', () => expect(validateZones([{ ...base, x: Number.NaN }])).toMatch(/posición/));
});
