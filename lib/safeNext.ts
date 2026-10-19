const BASE = 'http://x';

/**
 * Evita redirecciones abiertas: solo permite rutas internas.
 * Rechaza caracteres de control, barras invertidas y sus formas codificadas
 * (el parser WHATWG elimina tabuladores y saltos de línea y trata `\` como `/`),
 * y comprueba que la URL resuelta sigue en el mismo origen.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return '/';
  if (/[\x00-\x1f\x7f\\]|%5c|%09|%0a|%0d/i.test(next)) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
