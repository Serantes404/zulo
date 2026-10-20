import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeSupabase, type Call, type Result } from '@/lib/test/fakeSupabase';

const G = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
let respond: (c: Call) => Result;
let db: ReturnType<typeof fakeSupabase>;

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => db.client) }));
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ supabase: db.client, user: { id: 'me' } })) }));

const { createGroup } = await import('./actions');

const form = (name: string) => {
  const f = new FormData();
  f.set('name', name);
  return f;
};

beforeEach(() => {
  respond = () => ({ data: G });
  db = fakeSupabase((c) => respond(c));
});

describe('createGroup', () => {
  it('crea el grupo y redirige a él', async () => {
    await expect(createGroup(null, form('Scouts'))).rejects.toThrow(`REDIRECT:/g/${G}`);
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
  it('GROUP_LIMIT devuelve el mensaje del límite en vez de lanzar', async () => {
    respond = () => ({ error: { message: 'GROUP_LIMIT' } });
    expect(await createGroup(null, form('Scouts'))).toEqual({ error: 'Has llegado al máximo de 5 grupos creados.' });
  });
  it('otros errores devuelven un mensaje genérico', async () => {
    respond = () => ({ error: { message: 'boom' } });
    expect(await createGroup(null, form('Scouts'))).toEqual({ error: 'No se ha podido crear el grupo.' });
  });
  it('sin nombre no llama a la RPC', async () => {
    expect(await createGroup(null, form('  '))).toHaveProperty('error');
    expect(db.calls).toEqual([]);
  });
});
