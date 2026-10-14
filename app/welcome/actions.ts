'use server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { safeNext } from '@/lib/safeNext';

export async function saveName(next: string, formData: FormData) {
  const name = String(formData.get('full_name') ?? '').trim().slice(0, 80);
  if (!name) return;
  const { supabase, user } = await requireUser();
  await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
  await supabase.auth.updateUser({ data: { onboarded: true } });
  redirect(safeNext(next));
}
