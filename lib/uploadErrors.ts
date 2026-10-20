// Traduce el error de una subida a Storage a un mensaje para el usuario. Puro: sirve en cliente y en tests.
export const UPLOAD_LIMIT =
  'No se ha podido subir la foto. Puede que el grupo haya llegado al límite de fotos de hoy (500); inténtalo mañana.';
export const UPLOAD_TOO_BIG = 'La foto es demasiado grande o no es una imagen JPEG.';

export function uploadErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const e = err as { status?: unknown; statusCode?: unknown; message?: unknown };
  const codes = [e.status, e.statusCode].map((c) => String(c ?? ''));
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  // La política INSERT del bucket (tope diario por grupo) responde como violación de RLS / 403.
  if (codes.includes('403') || message.includes('row-level security')) return UPLOAD_LIMIT;
  if (codes.includes('413') || codes.includes('415') || message.includes('mime') || message.includes('maximum allowed size'))
    return UPLOAD_TOO_BIG;
  return fallback;
}
