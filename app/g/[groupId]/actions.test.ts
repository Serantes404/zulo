import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type Call, type Result } from '@/lib/test/fakeSupabase';
import { NO_PERMISSION } from '@/lib/errors';

const ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const G = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const U = '4e9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const WH = '5f9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';

let role: 'admin' | 'member' | null = 'admin';
let db: ReturnType<typeof fakeSupabase>;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ supabase: db.client, user: { id: ME } })),
  getRole: vi.fn(async () => role),
}));

const { createWarehouse, makeAdmin } = await import('./actions');

const respond = (call: Call): Result => {
  if (call.table === 'warehouses' && call.op === 'insert') return { data: { id: WH } };
  if (call.table === 'group_members' && call.op === 'update') return { data: [{ user_id: U }] };
  return {};
};

beforeEach(() => {
  role = 'admin';
  db = fakeSupabase(respond);
});

const nameForm = (name: string) => {
  const f = new FormData();
  f.set('name', name);
  return f;
};
const writes = () => db.calls.filter((c) => c.op !== 'select');

describe('createWarehouse', () => {
  it('un admin crea el almacén y va al editor', async () => {
    await expect(createWarehouse(G, null, nameForm('Local'))).rejects.toThrow(`REDIRECT:/g/${G}/w/${WH}/edit`);
    expect(writes()).toMatchObject([{ table: 'warehouses', op: 'insert', payload: { group_id: G, name: 'Local' } }]);
  });
  it('un miembro no admin recibe error y no inserta', async () => {
    role = 'member';
    expect(await createWarehouse(G, null, nameForm('Local'))).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it("groupId='x' devuelve error sin consultar", async () => {
    expect(await createWarehouse('x', null, nameForm('Local'))).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
  it('WAREHOUSE_LIMIT devuelve el mensaje del límite', async () => {
    db = fakeSupabase((c) => (c.op === 'insert' ? { error: { message: 'WAREHOUSE_LIMIT' } } : respond(c)));
    expect(await createWarehouse(G, null, nameForm('Local'))).toEqual({ error: 'Este grupo ya tiene el máximo de 20 almacenes.' });
  });
  it('sin nombre devuelve error', async () => {
    expect(await createWarehouse(G, null, nameForm(' '))).toHaveProperty('error');
    expect(db.calls).toEqual([]);
  });
});

describe('makeAdmin', () => {
  it('un admin hace admin a otro miembro', async () => {
    expect(await makeAdmin(G, U)).toEqual({ ok: true });
    expect(writes()).toMatchObject([{ table: 'group_members', op: 'update' }]);
  });
  it('un miembro no admin recibe error sin update', async () => {
    role = 'member';
    expect(await makeAdmin(G, U)).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it('ids que no son uuid devuelven error sin consultar', async () => {
    expect(await makeAdmin('x', U)).toEqual({ error: NO_PERMISSION });
    expect(await makeAdmin(G, 'x')).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
});
