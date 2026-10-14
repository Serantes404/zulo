'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export async function createWarehouse(groupId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
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

export async function makeAdmin(groupId: string, userId: string) {
  const { supabase } = await requireUser();
  await supabase.from('group_members').update({ role: 'admin' }).eq('group_id', groupId).eq('user_id', userId);
  revalidatePath(`/g/${groupId}`);
}
