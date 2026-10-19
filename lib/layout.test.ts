import { describe, it, expect } from 'vitest';
import { parseStoredLayout, validatePlan, validatePlanUpdate, DEFAULT_LAYOUT, MIN_ASPECT, MAX_ASPECT } from './layout';

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

describe('validatePlanUpdate', () => {
  const sketch = { path: 'g/plans/a.png', source: 'sketch' as const };
  const photo = { path: 'g/plans/b.jpg', source: 'photo' as const };
  const bad = 'El plano no es válido.';
  it('acepta un boceto con layout', () =>
    expect(validatePlanUpdate({ layout: DEFAULT_LAYOUT, aspectRatio: 1.5, image: sketch })).toBeNull());
  it('acepta un layout sin imagen nueva', () =>
    expect(validatePlanUpdate({ layout: ok as never, aspectRatio: 0.8 })).toBeNull());
  it('acepta una foto con layout null', () =>
    expect(validatePlanUpdate({ layout: null, aspectRatio: 1.7, image: photo })).toBeNull());
  it('rechaza layout null con boceto', () =>
    expect(validatePlanUpdate({ layout: null, aspectRatio: 1, image: sketch })).toBe(bad));
  it('rechaza layout null sin imagen', () =>
    expect(validatePlanUpdate({ layout: null, aspectRatio: 1 })).toBe(bad));
  it('rechaza proporciones malas', () => {
    expect(validatePlanUpdate({ layout: DEFAULT_LAYOUT, aspectRatio: 9, image: sketch })).toBe(bad);
    expect(validatePlanUpdate({ layout: null, aspectRatio: 0, image: photo })).toBe(bad);
    expect(validatePlanUpdate({ layout: null, aspectRatio: Number.NaN, image: photo })).toBe(bad);
  });
  it('rechaza proporciones fuera de límites en una foto', () => {
    expect(validatePlanUpdate({ layout: null, aspectRatio: 0.1, image: photo })).toBe(bad);
    expect(validatePlanUpdate({ layout: null, aspectRatio: 1e9, image: photo })).toBe(bad);
  });
  it('acepta las proporciones límite en una foto', () => {
    expect(validatePlanUpdate({ layout: null, aspectRatio: MIN_ASPECT, image: photo })).toBeNull();
    expect(validatePlanUpdate({ layout: null, aspectRatio: MAX_ASPECT, image: photo })).toBeNull();
  });
  it('rechaza un origen desconocido', () =>
    expect(validatePlanUpdate({ layout: DEFAULT_LAYOUT, aspectRatio: 1, image: { path: 'x', source: 'otro' as never } })).toBe(bad));
});
