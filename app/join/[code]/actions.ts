'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

export async function joinGroup(code: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  if (error || !data) redirect(`/join/${encodeURIComponent(code)}?error=1`);
  revalidatePath('/', 'layout'); // la cabecera (GroupSwitcher) debe mostrar el grupo nuevo
  redirect(`/g/${data}`);
}
