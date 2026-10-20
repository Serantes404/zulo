'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { deleteWarehouseError } from '@/lib/warehouseDelete';
import { parseWarehouseName } from '@/lib/warehouseName';

export async function createWarehouse(groupId: string, formData: FormData) {
  const name = parseWarehouseName(formData);
  if (!name) return;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('warehouses')
    .insert({ group_id: groupId, name })
    .select('id')
    .single();
  if (error || !data) throw new Error('No se ha podido crear el almacén');
  redirect(`/g/${groupId}/w/${data.id}/edit`);
}

export async function regenerateInvite(groupId: string) {
  const { supabase } = await requireUser();
  await supabase.rpc('regenerate_invite', { p_group: groupId });
  revalidatePath(`/g/${groupId}`);
}

export async function makeAdmin(groupId: string, userId: string): Promise<{ ok: true } | { error: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('group_members')
    .update({ role: 'admin' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('user_id');
  // Con RLS, si no eres admin el update no da error: simplemente no toca ninguna fila.
  if (error || !data || data.length === 0) return { error: 'No se ha podido hacer admin a este miembro.' };
  revalidatePath(`/g/${groupId}`);
  return { ok: true };
}

export async function renameWarehouse(
  groupId: string,
  whId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const name = parseWarehouseName(formData);
  if (!name) return { error: 'Escribe un nombre.' };
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('warehouses')
    .update({ name })
    .eq('id', whId)
    .eq('group_id', groupId)
    .select('id');
  if (error || !data || data.length === 0) return { error: 'No se ha podido renombrar el almacén.' };
  revalidatePath(`/g/${groupId}`);
  return { ok: true };
}

export async function deleteWarehouse(groupId: string, warehouseId: string): Promise<{ error: string } | undefined> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', warehouseId)
    .eq('group_id', groupId)
    .select('id');
  const message = deleteWarehouseError(error, data?.length ?? 0);
  if (message) return { error: message };
  revalidatePath(`/g/${groupId}`);
}
