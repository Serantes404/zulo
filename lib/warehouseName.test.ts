import { describe, it, expect } from 'vitest';
import { parseWarehouseName } from './warehouseName';

describe('parseWarehouseName', () => {
  it('recorta espacios', () => {
    const f = new FormData();
    f.set('name', '  Zulo  ');
    expect(parseWarehouseName(f)).toBe('Zulo');
  });
  it('limita a 80 caracteres', () => {
    const f = new FormData();
    f.set('name', 'a'.repeat(100));
    expect(parseWarehouseName(f)).toHaveLength(80);
  });
  it('vacío si falta o solo hay espacios', () => {
    expect(parseWarehouseName(new FormData())).toBe('');
    const f = new FormData();
    f.set('name', '   ');
    expect(parseWarehouseName(f)).toBe('');
  });
});
