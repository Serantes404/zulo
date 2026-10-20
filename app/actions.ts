'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { rpcErrorMessage } from '@/lib/errors';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export type CreateGroupState = { error: string } | { ok: true } | null;

// Con useActionState: los errores (p. ej. GROUP_LIMIT) se muestran en el formulario, no en error.tsx.
// Si va bien no se navega: el grupo nuevo aparece en la lista de /app.
export async function createGroup(_prev: CreateGroupState, formData: FormData): Promise<CreateGroupState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Escribe un nombre para el grupo.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error || !data) return { error: rpcErrorMessage(error?.message, 'No se ha podido crear el grupo.') };
  revalidatePath('/', 'layout'); // la lista de /app y la cabecera (GroupSwitcher) deben mostrar el grupo nuevo
  return { ok: true };
}
