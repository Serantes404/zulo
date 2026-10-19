import { describe, it, expect } from 'vitest';
import nextConfig from './next.config';

describe('next.config: cabeceras de seguridad', () => {
  it('desactiva X-Powered-By', () => expect(nextConfig.poweredByHeader).toBe(false));

  it('aplica las cabeceras a todas las rutas', async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
    const h = Object.fromEntries(rules[0].headers.map((x) => [x.key, x.value]));
    expect(h['Content-Security-Policy']).toBe(
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    );
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('same-origin');
    expect(h['Permissions-Policy']).toBe('camera=(self), microphone=(), geolocation=()');
  });
});
