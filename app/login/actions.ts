'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safeNext';
import { authErrorMessage, parseCredentials } from '@/lib/authForm';

// Tras entrar o registrarse se va directo a `next` (por defecto /app), sin onboarding obligatorio:
// el nombre por defecto sale del email (handle_new_user) y se cambia desde "Cambiar nombre".
export type AuthState = { error?: string; info?: string };

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(String(formData.get('next') ?? ''));
  const parsed = parseCredentials(formData);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.email, password: parsed.password });
  if (error) return { error: authErrorMessage(error.code) };
  redirect(next);
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
  redirect(next);
}
