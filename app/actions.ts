'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createGroup(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error || !data) throw new Error('No se ha podido crear el grupo');
  redirect(`/g/${data}`);
}
