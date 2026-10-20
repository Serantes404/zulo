import { z } from 'zod';

export const MIN_PASSWORD = 8;

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: 'Escribe un email válido.' })),
  // La contraseña no se recorta: los espacios forman parte de ella.
  // Máximo 72: es el límite de bcrypt, que usa Supabase Auth para guardar el hash.
  password: z.string().min(MIN_PASSWORD, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`).max(72),
});

export type ParsedCredentials =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

export function parseCredentials(formData: FormData): ParsedCredentials {
  const result = credentials.safeParse({
    email: formData.get('email') ?? '',
    password: formData.get('password') ?? '',
  });
  if (!result.success) return { ok: false, error: result.error.issues[0].message };
  return { ok: true, ...result.data };
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  // Neutro a propósito: no confirma si un email tiene cuenta (enumeración de usuarios).
  user_already_exists: 'No se ha podido crear la cuenta. Si ya tienes una, entra con tu contraseña.',
  email_exists: 'No se ha podido crear la cuenta. Si ya tienes una, entra con tu contraseña.',
  weak_password: 'Esa contraseña es demasiado débil. Prueba con una más larga.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos.',
  email_not_confirmed: 'Tienes que confirmar tu email antes de entrar.',
  signup_disabled: 'Ahora mismo no se pueden crear cuentas nuevas.',
};

/** Traduce los códigos de error de Supabase Auth a mensajes para el usuario. */
export function authErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || 'No se ha podido completar. Inténtalo de nuevo.';
}
