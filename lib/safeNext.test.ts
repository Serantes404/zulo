import { describe, it, expect } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('acepta rutas internas', () => expect(safeNext('/g/123')).toBe('/g/123'));
  it('devuelve / si no hay valor', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
  });
  it('rechaza URLs externas', () => expect(safeNext('https://evil.com')).toBe('/'));
  it('rechaza //host', () => expect(safeNext('//evil.com')).toBe('/'));
  it('rechaza /\\host', () => expect(safeNext('/\\/evil.com')).toBe('/'));
  it('rechaza /\\host sin segunda barra', () => expect(safeNext('/\\evil.com')).toBe('/'));
  it('rechaza tabulador tras la barra', () => expect(safeNext('/\t/evil.com')).toBe('/'));
  it('rechaza salto de línea tras la barra', () => expect(safeNext('/\n/evil.com')).toBe('/'));
  it('rechaza %09 sin decodificar', () => expect(safeNext('/%09/evil.com')).toBe('/'));
  it('rechaza %0a, %0d y %5C en cualquier capitalización', () => {
    expect(safeNext('/%0A/evil.com')).toBe('/');
    expect(safeNext('/%0d/evil.com')).toBe('/');
    expect(safeNext('/%5C/evil.com')).toBe('/');
    expect(safeNext('/%5cevil.com')).toBe('/');
  });
  it('rechaza el carácter DEL', () => expect(safeNext('/\x7f/evil.com')).toBe('/'));
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
});
