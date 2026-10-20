import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type Call, type Result } from '@/lib/test/fakeSupabase';
import { NO_PERMISSION } from '@/lib/errors';

const ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const G = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const U = '4e9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const WH = '5f9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';

let role: 'admin' | 'member' | null = 'admin';
let targetRole: 'admin' | 'member' | null = 'member';
let db: ReturnType<typeof fakeSupabase>;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ supabase: db.client, user: { id: ME } })),
  getRole: vi.fn(async (_sb: unknown, _g: string, uid: string) => (uid === ME ? role : targetRole)),
}));

let photosOk = true;
vi.mock('@/lib/groupPhotos', () => ({ removeGroupPhotos: vi.fn(async () => photosOk) }));

const { createWarehouse, deleteGroup, makeAdmin, removeMember } = await import('./actions');

const respond = (call: Call): Result => {
  if (call.table === 'warehouses' && call.op === 'insert') return { data: { id: WH } };
  if (call.table === 'groups' && call.op === 'select') return { data: { name: 'Scouts' } };
  if (call.table === 'group_members' && call.op === 'delete') return { data: [{ user_id: U }] };
  if (call.table === 'group_members' && call.op === 'update') return { data: [{ user_id: U }] };
  return {};
};

beforeEach(() => {
  photosOk = true;
  role = 'admin';
  targetRole = 'member';
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

describe('removeMember', () => {
  it('un admin echa a un miembro, borra la fila y regenera el link', async () => {
    expect(await removeMember(G, U)).toEqual({ ok: true });
    expect(writes()).toMatchObject([
      { table: 'group_members', op: 'delete', filters: [['group_id', G], ['user_id', U]] },
      { rpc: 'regenerate_invite', op: 'rpc', payload: { p_group: G } },
    ]);
  });
  it('un miembro no admin recibe error sin borrar', async () => {
    role = 'member';
    expect(await removeMember(G, U)).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it('ids que no son uuid devuelven error sin consultar', async () => {
    expect(await removeMember('x', U)).toEqual({ error: NO_PERMISSION });
    expect(await removeMember(G, 'x')).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
  it('no puede echarse a sí mismo', async () => {
    expect(await removeMember(G, ME)).toEqual({ error: 'No puedes echarte a ti mismo.' });
    expect(db.calls).toEqual([]);
  });
  it('un admin puede echar a otro admin y regenera el link', async () => {
    targetRole = 'admin';
    db = fakeSupabase((c) =>
      c.table === 'group_members' && c.op === 'select' ? { data: [{ user_id: ME }, { user_id: U }] } : respond(c),
    );
    expect(await removeMember(G, U)).toEqual({ ok: true });
    expect(writes()).toMatchObject([
      { table: 'group_members', op: 'delete', filters: [['group_id', G], ['user_id', U]] },
      { rpc: 'regenerate_invite', op: 'rpc' },
    ]);
  });
  it('no deja el grupo sin admins', async () => {
    targetRole = 'admin';
    db = fakeSupabase((c) => (c.table === 'group_members' && c.op === 'select' ? { data: [{ user_id: U }] } : respond(c)));
    expect(await removeMember(G, U)).toEqual({ error: 'El grupo necesita al menos un admin.' });
    expect(writes()).toEqual([]);
  });
  it('un objetivo de otro grupo (sin fila en este) devuelve NO_PERMISSION', async () => {
    targetRole = null;
    expect(await removeMember(G, U)).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it('objetivo inexistente devuelve NO_PERMISSION', async () => {
    targetRole = null;
    expect(await removeMember(G, U)).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it('0 filas borradas devuelve error genérico y no regenera', async () => {
    db = fakeSupabase((c) => (c.op === 'delete' ? { data: [] } : respond(c)));
    expect(await removeMember(G, U)).toEqual({ error: 'No se ha podido echar a este miembro.' });
    expect(writes().some((c) => c.op === 'rpc')).toBe(false);
  });
  it('error de BD no filtra texto crudo', async () => {
    db = fakeSupabase((c) => (c.op === 'delete' ? { error: { message: 'pg boom' } } : respond(c)));
    expect(await removeMember(G, U)).toEqual({ error: 'No se ha podido echar a este miembro.' });
  });
  it('si falla regenerar el link, informa con inviteWarning', async () => {
    db = fakeSupabase((c) => (c.op === 'rpc' ? { error: { message: 'x' } } : respond(c)));
    expect(await removeMember(G, U)).toEqual({ ok: true, inviteWarning: true });
  });
});

describe('deleteGroup', () => {
  const rpcs = () => db.calls.filter((c) => c.op === 'rpc');
  it('un admin con el nombre correcto borra fotos y grupo y vuelve a la portada', async () => {
    await expect(deleteGroup(G, ' Scouts ')).rejects.toThrow('REDIRECT:/');
    expect(rpcs()).toMatchObject([{ rpc: 'delete_group', payload: { p_group: G, p_name: 'Scouts' } }]);
  });
  it('un miembro no admin recibe error sin borrar nada', async () => {
    role = 'member';
    expect(await deleteGroup(G, 'Scouts')).toEqual({ error: NO_PERMISSION });
    expect(rpcs()).toEqual([]);
  });
  it('con otro nombre no borra', async () => {
    expect(await deleteGroup(G, 'scouts')).toEqual({ error: 'El nombre no coincide con el del grupo.' });
    expect(rpcs()).toEqual([]);
  });
  it('un nombre que no es texto devuelve error sin consultar', async () => {
    expect(await deleteGroup(G, 42 as unknown as string)).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
  it("groupId='x' devuelve error sin consultar", async () => {
    expect(await deleteGroup('x', 'Scouts')).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
  it('si fallan las fotos no borra el grupo', async () => {
    photosOk = false;
    expect(await deleteGroup(G, 'Scouts')).toHaveProperty('error');
    expect(rpcs()).toEqual([]);
  });
  it('si la base de datos lo rechaza devuelve su mensaje', async () => {
    db = fakeSupabase((c) => (c.op === 'rpc' ? { error: { message: 'FORBIDDEN' } } : respond(c)));
    expect(await deleteGroup(G, 'Scouts')).toEqual({ error: NO_PERMISSION });
  });
});
