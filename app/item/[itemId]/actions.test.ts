import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fakeSupabase, type Call, type Result } from '@/lib/test/fakeSupabase';
import { BAD_PHOTO, NO_PERMISSION, quantityBelowLentMessage } from '@/lib/errors';
import { DUE_DATE_PAST } from '@/lib/schemas';

const ME = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const G = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const OTHER_G = '1b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const ITEM = '2c9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const LOAN = '3d9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const photo = (g: string, kind: string, n = 1) => `${g}/${kind}/7a1d9e55-0c2b-4f6e-8d3a-9b8c7d6e5f4${n}.jpg`;

let role: 'admin' | 'member' | null = 'admin';
let respond: (call: Call) => Result;
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

const { checkoutAction, returnAction, setItemPhoto, updateItem, deleteItem } = await import('./actions');

// Respuestas por defecto: el material es del grupo G y el préstamo salió con photo(G,'loans',1).
function defaults(call: Call): Result {
  if (call.table === 'items' && call.op === 'select') return { data: { id: ITEM, zones: { warehouses: { group_id: G } } } };
  if (call.table === 'loans' && call.op === 'select')
    return { data: { item_id: ITEM, checkout_photo_path: photo(G, 'loans', 1), items: { zones: { warehouses: { group_id: G } } } } };
  if (call.table === 'item_availability') return { data: { quantity_out: 0, quantity_available: 5 } };
  if (call.op === 'update' || call.op === 'delete') return { data: [{ id: ITEM }] };
  return {};
}

beforeEach(() => {
  role = 'admin';
  respond = defaults;
  db = fakeSupabase((c) => respond(c));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const writes = () => db.calls.filter((c) => c.op !== 'select');

describe('checkoutAction', () => {
  const ok = { itemId: ITEM, quantity: 1, purpose: 'Campamento', dueDate: '2026-10-25', photoPath: photo(G, 'loans', 2) };

  it('con una foto válida del grupo del material llama a checkout_item', async () => {
    expect(await checkoutAction(ok)).toEqual({ ok: true });
    expect(writes()).toMatchObject([{ rpc: 'checkout_item', payload: { p_photo: ok.photoPath } }]);
  });
  it('rechaza una foto de préstamo de otro grupo sin llamar a la RPC', async () => {
    expect(await checkoutAction({ ...ok, photoPath: photo(OTHER_G, 'loans') })).toEqual({ error: BAD_PHOTO });
    expect(writes()).toEqual([]);
  });
  it('rechaza una foto de otra carpeta o una ruta libre', async () => {
    expect(await checkoutAction({ ...ok, photoPath: photo(G, 'items') })).toHaveProperty('error');
    expect(await checkoutAction({ ...ok, photoPath: 'p' })).toHaveProperty('error');
    expect(db.calls).toEqual([]);
  });
  it('rechaza si el material no se ve (otro grupo)', async () => {
    respond = (c) => (c.table === 'items' ? { data: null } : defaults(c));
    expect(await checkoutAction(ok)).toHaveProperty('error');
    expect(writes()).toEqual([]);
  });
  it('los errores de zod que no son nuestros no muestran texto en inglés', async () => {
    expect(await checkoutAction({ ...ok, dueDate: 42 })).toEqual({ error: 'Revisa los datos del formulario.' });
    expect(await checkoutAction({ ...ok, dueDate: undefined })).toEqual({ error: 'Revisa los datos del formulario.' });
  });
  it('rechaza fechas inexistentes, pasadas o lejanas y cantidades enormes sin consultar', async () => {
    expect(await checkoutAction({ ...ok, dueDate: '2026-02-31' })).toHaveProperty('error');
    expect(await checkoutAction({ ...ok, dueDate: '2026-10-19' })).toEqual({ error: DUE_DATE_PAST });
    expect(await checkoutAction({ ...ok, dueDate: '9999-12-31' })).toHaveProperty('error');
    expect(await checkoutAction({ ...ok, quantity: 1e10 })).toHaveProperty('error');
    expect(db.calls).toEqual([]);
  });
});

describe('returnAction', () => {
  const ok = { loanId: LOAN, photoPath: photo(G, 'loans', 3), condition: 'ok' };

  it('con una foto nueva del grupo llama a return_loan', async () => {
    expect(await returnAction(ok)).toEqual({ ok: true });
    expect(writes()).toMatchObject([{ rpc: 'return_loan', payload: { p_photo: ok.photoPath } }]);
  });
  it('rechaza usar la foto de salida como foto de devolución', async () => {
    expect(await returnAction({ ...ok, photoPath: photo(G, 'loans', 1) })).toHaveProperty('error');
    expect(writes()).toEqual([]);
  });
  it('rechaza una foto de otro grupo', async () => {
    expect(await returnAction({ ...ok, photoPath: photo(OTHER_G, 'loans', 3) })).toEqual({ error: BAD_PHOTO });
    expect(writes()).toEqual([]);
  });
  it('rechaza un préstamo que no se ve', async () => {
    respond = (c) => (c.table === 'loans' ? { data: null } : defaults(c));
    expect(await returnAction(ok)).toHaveProperty('error');
    expect(writes()).toEqual([]);
  });
});

describe('setItemPhoto', () => {
  it('guarda una foto de items del grupo del material', async () => {
    expect(await setItemPhoto(ITEM, photo(G, 'items'))).toEqual({ ok: true });
    expect(writes()).toMatchObject([{ table: 'items', op: 'update', payload: { photo_path: photo(G, 'items') } }]);
  });
  it('rechaza una foto de préstamo (puede mostrar personas) sin llamar a update', async () => {
    expect(await setItemPhoto(ITEM, photo(G, 'loans'))).toEqual({ error: BAD_PHOTO });
    expect(writes()).toEqual([]);
  });
  it('rechaza una foto de otro grupo', async () => {
    expect(await setItemPhoto(ITEM, photo(OTHER_G, 'items'))).toEqual({ error: BAD_PHOTO });
    expect(writes()).toEqual([]);
  });
  it('un miembro no admin recibe error y no se escribe nada', async () => {
    role = 'member';
    expect(await setItemPhoto(ITEM, photo(G, 'items'))).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it("itemId='x' devuelve error sin consultar", async () => {
    expect(await setItemPhoto('x', photo(G, 'items'))).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
});

const form = (name: string, quantity: string) => {
  const f = new FormData();
  f.set('name', name);
  f.set('quantity', quantity);
  return f;
};

describe('updateItem', () => {
  it('un admin guarda los cambios', async () => {
    expect(await updateItem(ITEM, null, form('Linternas', '5'))).toEqual({ ok: true });
    expect(writes()).toMatchObject([{ table: 'items', op: 'update', payload: { name: 'Linternas', quantity_total: 5 } }]);
  });
  it('un miembro recibe error y no se llama a update', async () => {
    role = 'member';
    expect(await updateItem(ITEM, null, form('Linternas', '5'))).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it("itemId='x' devuelve error sin consultar", async () => {
    expect(await updateItem('x', null, form('Linternas', '5'))).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
  it('no deja bajar el total por debajo de lo prestado', async () => {
    respond = (c) => (c.table === 'item_availability' ? { data: { quantity_out: 3 } } : defaults(c));
    expect(await updateItem(ITEM, null, form('Linternas', '2'))).toEqual({ error: quantityBelowLentMessage(3) });
    expect(writes()).toEqual([]);
  });
  it('traduce QUANTITY_BELOW_LENT de la BD (préstamo simultáneo) con el número actual', async () => {
    let out = 0;
    respond = (c) => {
      if (c.table === 'item_availability') return { data: { quantity_out: out } };
      if (c.op === 'update') {
        out = 4;
        return { error: { message: 'QUANTITY_BELOW_LENT' } };
      }
      return defaults(c);
    };
    expect(await updateItem(ITEM, null, form('Linternas', '2'))).toEqual({ error: quantityBelowLentMessage(4) });
  });
  it('si el update no toca filas devuelve error, no "guardado"', async () => {
    respond = (c) => (c.op === 'update' ? { data: [] } : defaults(c));
    expect(await updateItem(ITEM, null, form('Linternas', '5'))).toHaveProperty('error');
  });
});

describe('deleteItem', () => {
  it('un admin borra y vuelve a backTo saneado', async () => {
    await expect(deleteItem(ITEM, '/.//evil.com')).rejects.toThrow('REDIRECT:/');
    expect(writes()).toMatchObject([{ table: 'items', op: 'delete' }]);
  });
  it('un miembro recibe error y no se llama a delete', async () => {
    role = 'member';
    expect(await deleteItem(ITEM, '/g')).toEqual({ error: NO_PERMISSION });
    expect(writes()).toEqual([]);
  });
  it("itemId='x' devuelve error sin consultar", async () => {
    expect(await deleteItem('x', '/g')).toEqual({ error: NO_PERMISSION });
    expect(db.calls).toEqual([]);
  });
  it('si el delete no toca filas devuelve error', async () => {
    respond = (c) => (c.op === 'delete' ? { data: [] } : defaults(c));
    expect(await deleteItem(ITEM, '/g')).toHaveProperty('error');
  });
});
