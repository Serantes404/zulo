'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getRole, requireUser } from '@/lib/auth';
import { NO_PERMISSION, rpcErrorMessage } from '@/lib/errors';
import { removeGroupPhotos } from '@/lib/groupPhotos';
import { isUuid } from '@/lib/schemas';
import { deleteWarehouseError } from '@/lib/warehouseDelete';
import { parseWarehouseName } from '@/lib/warehouseName';

export type CreateWarehouseState = { error: string } | null;

// Con useActionState: los errores (permiso, WAREHOUSE_LIMIT) se muestran en el diálogo. Si va bien, redirige al editor.
export async function createWarehouse(
  groupId: string,
  _prev: CreateWarehouseState,
  formData: FormData,
): Promise<CreateWarehouseState> {
  const name = parseWarehouseName(formData);
  if (!name) return { error: 'Escribe un nombre.' };
  if (!isUuid(groupId)) return { error: NO_PERMISSION };
  const { supabase, user } = await requireUser();
  // Defensa en profundidad: RLS ya lo impide, pero no nos fiamos solo de ello.
  if ((await getRole(supabase, groupId, user.id)) !== 'admin') return { error: NO_PERMISSION };
  const { data, error } = await supabase
    .from('warehouses')
    .insert({ group_id: groupId, name })
    .select('id')
    .single();
  if (error || !data) return { error: rpcErrorMessage(error?.message, 'No se ha podido crear el almacén.') };
  redirect(`/g/${groupId}/w/${data.id}/edit`);
}

export async function regenerateInvite(groupId: string): Promise<{ ok: true } | { error: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('regenerate_invite', { p_group: groupId });
  if (error) return { error: 'No se ha podido crear el link nuevo.' };
  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/grupo`);
  return { ok: true };
}

export async function makeAdmin(groupId: string, userId: string): Promise<{ ok: true } | { error: string }> {
  if (!isUuid(groupId) || !isUuid(userId)) return { error: NO_PERMISSION };
  const { supabase, user } = await requireUser();
  if ((await getRole(supabase, groupId, user.id)) !== 'admin') return { error: NO_PERMISSION };
  const { data, error } = await supabase
    .from('group_members')
    .update({ role: 'admin' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('user_id');
  // Con RLS, si no eres admin el update no da error: simplemente no toca ninguna fila.
  if (error || !data || data.length === 0) return { error: 'No se ha podido hacer admin a este miembro.' };
  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/grupo`);
  return { ok: true };
}

export type RemoveMemberResult = { ok: true; inviteWarning?: true } | { error: string };

export async function removeMember(groupId: string, userId: string): Promise<RemoveMemberResult> {
  if (!isUuid(groupId) || !isUuid(userId)) return { error: NO_PERMISSION };
  const { supabase, user } = await requireUser();
  if (userId === user.id) return { error: 'No puedes echarte a ti mismo.' };
  if ((await getRole(supabase, groupId, user.id)) !== 'admin') return { error: NO_PERMISSION };
  // Defensa en profundidad: el objetivo debe existir en este grupo (admin o miembro).
  const targetRole = await getRole(supabase, groupId, userId);
  if (targetRole !== 'admin' && targetRole !== 'member') return { error: NO_PERMISSION };
  if (targetRole === 'admin') {
    // Nunca dejar el grupo sin admins (el que llama es admin y no puede echarse a sí mismo, pero se comprueba).
    const { data: admins, error: adminsError } = await supabase.from('group_members').select('user_id').eq('group_id', groupId).eq('role', 'admin');
    if (adminsError || !admins) return { error: 'No se ha podido echar a este miembro.' };
    if (!admins.some((a) => a.user_id !== userId)) return { error: 'El grupo necesita al menos un admin.' };
  }
  const { data, error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select('user_id');
  if (error || !data || data.length === 0) return { error: 'No se ha podido echar a este miembro.' };
  // El link antiguo dejaría volver a entrar: se invalida. Si falla, la expulsión ya está hecha.
  const { error: inviteError } = await supabase.rpc('regenerate_invite', { p_group: groupId });
  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/grupo`);
  revalidatePath(`/g/${groupId}/prestamos`);
  return inviteError ? { ok: true, inviteWarning: true } : { ok: true };
}

// Elimina el grupo entero. Primero se comprueba todo, luego las fotos (hace falta ser admin para
// borrarlas) y al final delete_group, que vuelve a comprobar admin y nombre en la base de datos.
export async function deleteGroup(groupId: string, confirmName: string): Promise<{ error: string }> {
  if (!isUuid(groupId)) return { error: NO_PERMISSION };
  const { supabase, user } = await requireUser();
  if ((await getRole(supabase, groupId, user.id)) !== 'admin') return { error: NO_PERMISSION };
  const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single();
  if (!group) return { error: NO_PERMISSION };
  if (confirmName.trim() !== group.name) return { error: rpcErrorMessage('NAME_MISMATCH') };
  if (!(await removeGroupPhotos(supabase, groupId))) return { error: 'No se han podido borrar las fotos. Inténtalo de nuevo.' };
  const { error } = await supabase.rpc('delete_group', { p_group: groupId, p_name: confirmName });
  if (error) return { error: rpcErrorMessage(error.message, 'No se ha podido eliminar el grupo.') };
  revalidatePath('/', 'layout');
  redirect('/');
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
