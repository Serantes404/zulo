import { describe, it, expect } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('acepta rutas internas', () => expect(safeNext('/g/123')).toBe('/g/123'));
  it('devuelve / si no hay valor', () => expect(safeNext(null)).toBe('/'));
  it('rechaza URLs externas', () => expect(safeNext('https://malo.com')).toBe('/'));
  it('rechaza //host', () => expect(safeNext('//malo.com')).toBe('/'));
  it('rechaza /\\host', () => expect(safeNext('/\\malo.com')).toBe('/'));
});
