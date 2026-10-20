const BASE = 'http://x';

/** Adonde se va tras entrar o registrarse si no hay `next` válido. */
export const HOME = '/app';

/**
 * Evita redirecciones abiertas: solo permite rutas internas.
 * Rechaza caracteres de control, barras invertidas y sus formas codificadas
 * (el parser WHATWG elimina tabuladores y saltos de línea y trata `\` como `/`),
 * y comprueba que la URL resuelta sigue en el mismo origen.
 * Es idempotente: `/.//evil.com` o `/x/..//evil.com` se normalizan a `//evil.com`, que en un
 * redirect sería otro host, así que también se rechaza el resultado si empieza por `//` o `/\`.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return HOME;
  if (/[\x00-\x1f\x7f\\]|%5c|%09|%0a|%0d/i.test(next)) return HOME;
  if (!next.startsWith('/') || next.startsWith('//')) return HOME;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return HOME;
    const out = url.pathname + url.search + url.hash;
    return out.startsWith('//') || out.startsWith('/\\') ? HOME : out;
  } catch {
    return HOME;
  }
}
