'use server';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safeNext';
import { authErrorMessage, parseCredentials } from '@/lib/authForm';

export type AuthState = { error?: string; info?: string };

function afterLogin(user: User | null, next: string): never {
  const onboarded = user?.user_metadata?.onboarded === true;
  redirect(onboarded ? next : `/welcome?next=${encodeURIComponent(next)}`);
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(String(formData.get('next') ?? ''));
  const parsed = parseCredentials(formData);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.email, password: parsed.password });
  if (error) return { error: authErrorMessage(error.code) };
  afterLogin(data.user, next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(String(formData.get('next') ?? ''));
  const parsed = parseCredentials(formData);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: parsed.email, password: parsed.password });
  if (error) return { error: authErrorMessage(error.code) };
  // Si en Supabase sigue activo "Confirm email", no hay sesión hasta confirmar por email.
  if (!data.session) return { info: 'Revisa tu email para confirmar la cuenta y después entra.' };
  afterLogin(data.user, next);
}
