import { describe, it, expect } from 'vitest';
import { parseZonesArg, parsePlanUpdateArg, parsePendingArg, TOO_MANY_ZONES, BAD_PLAN_ARGS } from './planActionArgs';
import { PALETTE } from './zones';
import { MAX_ZONES } from './ai/normalize';

const zone = { key: 'k1', label: 'Tiendas', color: PALETTE[0], x: 0.1, y: 0.1, w: 0.3, h: 0.3 };
const ID = '7a1d9e55-0c2b-4f6e-8d3a-9b8c7d6e5f40';

describe('parseZonesArg', () => {
  it('acepta zonas válidas, con y sin id, y quita campos extra', () => {
    const r = parseZonesArg([zone, { ...zone, id: ID, extra: 'x' }]);
    expect(r).toEqual({ ok: true, zones: [zone, { ...zone, id: ID }] });
  });
  it('rechaza lo que no es un array', () => {
    expect(parseZonesArg('abc')).toEqual({ ok: false, error: BAD_PLAN_ARGS });
    expect(parseZonesArg({ length: 1 })).toEqual({ ok: false, error: BAD_PLAN_ARGS });
    expect(parseZonesArg(null)).toEqual({ ok: false, error: BAD_PLAN_ARGS });
  });
  it('rechaza etiquetas que no son string o son enormes', () => {
    expect(parseZonesArg([{ ...zone, label: 1 }])).toMatchObject({ ok: false });
    expect(parseZonesArg([{ ...zone, label: 'x'.repeat(201) }])).toMatchObject({ ok: false });
    expect(parseZonesArg([{ ...zone, key: 'x'.repeat(101) }])).toMatchObject({ ok: false });
  });
  it('rechaza números no finitos o fuera de 0..1', () => {
    for (const bad of [NaN, Infinity, -0.1, 1.1, '0.5'])
      expect(parseZonesArg([{ ...zone, x: bad }])).toMatchObject({ ok: false });
  });
  it('rechaza un id que no es uuid', () => expect(parseZonesArg([{ ...zone, id: 'x' }])).toMatchObject({ ok: false }));
  it(`más de ${MAX_ZONES} zonas da su propio mensaje`, () =>
    expect(parseZonesArg(Array.from({ length: MAX_ZONES + 1 }, () => zone))).toEqual({ ok: false, error: TOO_MANY_ZONES }));
});

describe('parsePlanUpdateArg', () => {
  const layout = { doors: [], corridors: [] };
  it('acepta undefined (sin cambios de plano)', () => expect(parsePlanUpdateArg(undefined)).toEqual({ ok: true, plan: undefined }));
  it('acepta un plano válido', () =>
    expect(parsePlanUpdateArg({ layout, aspectRatio: 1.5, image: { path: 'a/plans/b.jpg', source: 'sketch' } })).toMatchObject({ ok: true }));
  it('rechaza formas raras', () => {
    expect(parsePlanUpdateArg('x')).toMatchObject({ ok: false });
    expect(parsePlanUpdateArg({ layout, aspectRatio: '1' })).toMatchObject({ ok: false });
    expect(parsePlanUpdateArg({ layout, aspectRatio: NaN })).toMatchObject({ ok: false });
    expect(parsePlanUpdateArg({ layout, aspectRatio: 1, image: { path: 1, source: 'photo' } })).toMatchObject({ ok: false });
    expect(parsePlanUpdateArg({ layout, aspectRatio: 1, image: { path: 'x'.repeat(201), source: 'photo' } })).toMatchObject({ ok: false });
    expect(parsePlanUpdateArg({ layout, aspectRatio: 1, image: { path: 'p', source: 'x' } })).toMatchObject({ ok: false });
  });
});

describe('parsePendingArg', () => {
  it('acepta undefined y una imagen pendiente válida', () => {
    expect(parsePendingArg(undefined)).toEqual({ ok: true, pending: undefined });
    expect(parsePendingArg({ path: 'p', source: 'photo' })).toEqual({ ok: true, pending: { path: 'p', source: 'photo' } });
  });
  it('rechaza formas raras', () => {
    expect(parsePendingArg('p')).toEqual({ ok: false });
    expect(parsePendingArg({ path: ['p'], source: 'photo' })).toEqual({ ok: false });
    expect(parsePendingArg({ path: 'p', source: 'x' })).toEqual({ ok: false });
  });
});
