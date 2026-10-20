import { describe, expect, it } from 'vitest';
import { clampQuantity } from './quantity';

describe('clampQuantity', () => {
  it('respeta valores dentro del rango', () => expect(clampQuantity('3', 5)).toBe(3));
  it('vacío o texto inválido da 1', () => {
    expect(clampQuantity('', 5)).toBe(1);
    expect(clampQuantity('abc', 5)).toBe(1);
  });
  it('limita por arriba y por abajo', () => {
    expect(clampQuantity('13', 5)).toBe(5);
    expect(clampQuantity('0', 5)).toBe(1);
    expect(clampQuantity('-4', 5)).toBe(1);
  });
  it('acepta números y trunca decimales', () => expect(clampQuantity(2.9, 5)).toBe(2));
  it('max menor que 1 se trata como 1', () => expect(clampQuantity('4', 0)).toBe(1));
});
