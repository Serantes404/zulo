import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type Call, type Result } from '@/lib/test/fakeSupabase';

const G = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const WH = '5f9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const Z = '6a9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
let respond: (c: Call) => Result;
let db: ReturnType<typeof fakeSupabase>;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ supabase: db.client, user: { id: 'me' } })) }));

const { createItem } = await import('./actions');

const form = () => {
  const f = new FormData();
  f.set('name', 'Linternas');
  f.set('quantity', '3');
  return f;
};

beforeEach(() => {
  respond = (c) => (c.table === 'zones' ? { data: { id: Z } } : {});
  db = fakeSupabase((c) => respond(c));
});

describe('createItem', () => {
  it('añade el material', async () => expect(await createItem(G, WH, Z, form())).toEqual({ ok: true }));
  it('ITEM_LIMIT devuelve el mensaje del límite', async () => {
    respond = (c) => (c.op === 'insert' ? { error: { message: 'ITEM_LIMIT' } } : { data: { id: Z } });
    expect(await createItem(G, WH, Z, form())).toEqual({ error: 'Este grupo ya tiene el máximo de 2000 materiales.' });
  });
  it('otros errores mantienen el mensaje genérico', async () => {
    respond = (c) => (c.op === 'insert' ? { error: { message: 'boom' } } : { data: { id: Z } });
    expect(await createItem(G, WH, Z, form())).toEqual({ error: 'No se ha podido añadir el material. Inténtalo de nuevo.' });
  });
});
