import { describe, it, expect } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('acepta rutas internas', () => expect(safeNext('/g/123')).toBe('/g/123'));
  it('devuelve / si no hay valor', () => {
    expect(safeNext(null)).toBe('/app');
    expect(safeNext(undefined)).toBe('/app');
    expect(safeNext('')).toBe('/app');
  });
  it('rechaza URLs externas', () => expect(safeNext('https://evil.com')).toBe('/app'));
  it('rechaza //host', () => expect(safeNext('//evil.com')).toBe('/app'));
  it('rechaza /\\host', () => expect(safeNext('/\\/evil.com')).toBe('/app'));
  it('rechaza /\\host sin segunda barra', () => expect(safeNext('/\\evil.com')).toBe('/app'));
  it('rechaza tabulador tras la barra', () => expect(safeNext('/\t/evil.com')).toBe('/app'));
  it('rechaza salto de línea tras la barra', () => expect(safeNext('/\n/evil.com')).toBe('/app'));
  it('rechaza %09 sin decodificar', () => expect(safeNext('/%09/evil.com')).toBe('/app'));
  it('rechaza %0a, %0d y %5C en cualquier capitalización', () => {
    expect(safeNext('/%0A/evil.com')).toBe('/app');
    expect(safeNext('/%0d/evil.com')).toBe('/app');
    expect(safeNext('/%5C/evil.com')).toBe('/app');
    expect(safeNext('/%5cevil.com')).toBe('/app');
  });
  it('rechaza el carácter DEL', () => expect(safeNext('/\x7f/evil.com')).toBe('/app'));
  it('/ /evil.com no resuelve fuera del origen', () => {
    const r = safeNext('/ /evil.com');
    expect(r.startsWith('/')).toBe(true);
    expect(r.startsWith('//')).toBe(false);
  });
  it('conserva rutas válidas', () => {
    expect(safeNext('/g/abc')).toBe('/g/abc');
    expect(safeNext('/g/abc?x=1#h')).toBe('/g/abc?x=1#h');
    expect(safeNext('/join/CODE')).toBe('/join/CODE');
  });

  const malicious = [
    '/.//evil.com',
    '/x/..//evil.com',
    '/%2e//evil.com',
    '/%2E%2E//evil.com',
    '/./\\evil.com',
    '/a/b/../..//evil.com',
    '/%2e%2e/%2e%2e//evil.com',
    '/.//evil.com?x=1#h',
  ];
  it.each(malicious)('segmentos de punto que acaban en //host: %s → /app', (x) => expect(safeNext(x)).toBe('/app'));

  const samples = [
    ...malicious,
    null,
    '',
    '/g/abc',
    '/g/abc?x=1#h',
    '/a/../b',
    '/./g/abc',
    '/%2e/g',
    '//evil.com',
    'https://evil.com',
    '/ /evil.com',
    '/join/CODE',
  ];
  it.each(samples)('es idempotente: %s', (x) => {
    const once = safeNext(x);
    expect(safeNext(once)).toBe(once);
    expect(once.startsWith('/')).toBe(true);
    expect(once.startsWith('//') || once.startsWith('/\\')).toBe(false);
  });
});
