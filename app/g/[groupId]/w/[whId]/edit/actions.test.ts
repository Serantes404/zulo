import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase } from '@/lib/test/fakeSupabase';
import { BAD_PLAN_ARGS } from '@/lib/planActionArgs';

const ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const G = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const WH = '5f9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';

let db: ReturnType<typeof fakeSupabase>;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ supabase: db.client, user: { id: ME } })),
  getRole: vi.fn(async () => 'admin'),
}));
vi.mock('@/lib/ai/detectZones', () => ({
  detectZonesFromImage: vi.fn(),
  planTooLarge: () => false,
  quotaFailure: () => 'QUOTA',
}));

const { saveZones, detectZonesAction, previewPlanImage } = await import('./actions');

beforeEach(() => {
  db = fakeSupabase(() => ({}));
});

// Llamadas con argumentos que el tipo no permite pero un script sí puede mandar.
const any = (v: unknown) => v as never;

describe('saveZones', () => {
  it("zones='abc' devuelve error sin lanzar ni consultar", async () => {
    expect(await saveZones(G, WH, any('abc'))).toEqual({ error: BAD_PLAN_ARGS });
    expect(db.calls).toEqual([]);
  });
  it('label numérico devuelve error sin lanzar', async () => {
    const zone = { key: 'k', label: 1, color: '#E4572E', x: 0, y: 0, w: 0.5, h: 0.5 };
    expect(await saveZones(G, WH, any([zone]))).toEqual({ error: BAD_PLAN_ARGS });
    expect(db.calls).toEqual([]);
  });
  it('plan con forma rara devuelve error', async () => {
    expect(await saveZones(G, WH, [], any({ layout: null, aspectRatio: 'x' }))).toEqual({ error: BAD_PLAN_ARGS });
    expect(db.calls).toEqual([]);
  });
  it('ids que no son uuid devuelven error sin consultar', async () => {
    expect(await saveZones('x', WH, [])).toHaveProperty('error');
    expect(await saveZones(G, 'x', [])).toHaveProperty('error');
    expect(db.calls).toEqual([]);
  });
});

describe('detectZonesAction', () => {
  it('pending con forma rara no consume cuota ni consulta', async () => {
    expect(await detectZonesAction(G, WH, any({ path: ['x'], source: 'photo' }))).toEqual({ ok: false, reason: 'NO_ZONES' });
    expect(await detectZonesAction(G, WH, any('x'))).toEqual({ ok: false, reason: 'NO_ZONES' });
    expect(db.calls).toEqual([]);
  });
  it('ids que no son uuid no consultan', async () => {
    expect(await detectZonesAction('x', WH)).toEqual({ ok: false, reason: 'UNAVAILABLE' });
    expect(db.calls).toEqual([]);
  });
});

describe('previewPlanImage', () => {
  it('argumentos con forma rara devuelven error sin lanzar ni consultar', async () => {
    expect(await previewPlanImage(G, WH, any(42), 1, 'photo')).toHaveProperty('error');
    expect(await previewPlanImage(G, WH, 'p', any('1'), 'photo')).toHaveProperty('error');
    expect(await previewPlanImage(G, WH, 'x'.repeat(500), 1, any('x'))).toHaveProperty('error');
    expect(db.calls).toEqual([]);
  });
});
