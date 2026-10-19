import { describe, it, expect } from 'vitest';
import { parseStoredLayout, validatePlan, DEFAULT_LAYOUT } from './layout';

const ok = {
  doors: [{ wall: 'left', start: 0.8, end: 0.86 }],
  corridors: [{ label: 'Pasillo', x: 0.3, y: 0, w: 0.4, h: 1 }],
};

describe('parseStoredLayout', () => {
  it('acepta un layout válido', () => expect(parseStoredLayout(ok)).toEqual(ok));
  it('acepta el layout vacío', () => expect(parseStoredLayout(DEFAULT_LAYOUT)).toEqual(DEFAULT_LAYOUT));
  it('null si no es un objeto', () => {
    expect(parseStoredLayout(null)).toBeNull();
    expect(parseStoredLayout('x')).toBeNull();
  });
  it('null si una puerta tiene una pared desconocida', () =>
    expect(parseStoredLayout({ ...ok, doors: [{ wall: 'techo', start: 0.1, end: 0.2 }] })).toBeNull());
  it('null si una puerta acaba antes de empezar', () =>
    expect(parseStoredLayout({ ...ok, doors: [{ wall: 'top', start: 0.5, end: 0.4 }] })).toBeNull());
  it('null si hay coordenadas fuera de 0-1', () =>
    expect(parseStoredLayout({ ...ok, corridors: [{ label: 'P', x: 1.5, y: 0, w: 0.1, h: 1 }] })).toBeNull());
});

describe('validatePlan', () => {
  it('null si es válido', () => expect(validatePlan({ layout: ok, aspectRatio: 0.8 })).toBeNull());
  it('rechaza un layout inválido', () =>
    expect(validatePlan({ layout: { doors: 'x' }, aspectRatio: 1 })).toBe('El plano no es válido.'));
  it('rechaza proporciones fuera de 0.25-4 o no finitas', () => {
    expect(validatePlan({ layout: ok, aspectRatio: 5 })).toBe('El plano no es válido.');
    expect(validatePlan({ layout: ok, aspectRatio: Number.NaN })).toBe('El plano no es válido.');
  });
});
