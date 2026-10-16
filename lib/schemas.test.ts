import { describe, it, expect } from 'vitest';
import { itemSchema, checkoutSchema, returnSchema } from './schemas';

const id = crypto.randomUUID();

describe('itemSchema', () => {
  it('limpia el nombre y convierte la cantidad', () =>
    expect(itemSchema.parse({ name: ' Linternas ', quantity: '20' })).toEqual({ name: 'Linternas', quantity: 20 }));
  it('rechaza cantidad 0', () => expect(itemSchema.safeParse({ name: 'A', quantity: '0' }).success).toBe(false));
  it('rechaza nombre vacío', () => expect(itemSchema.safeParse({ name: ' ', quantity: '1' }).success).toBe(false));
});

describe('checkoutSchema', () => {
  const ok = { itemId: id, quantity: 2, purpose: 'Campamento', dueDate: '2026-10-21', photoPath: 'g/loans/x.jpg' };
  it('acepta datos válidos', () => expect(checkoutSchema.safeParse(ok).success).toBe(true));
  it('rechaza fecha mal formada', () => expect(checkoutSchema.safeParse({ ...ok, dueDate: '21/10/2026' }).success).toBe(false));
  it('rechaza sin foto', () => expect(checkoutSchema.safeParse({ ...ok, photoPath: '' }).success).toBe(false));
});

describe('returnSchema', () => {
  it('pone notas vacías por defecto', () =>
    expect(returnSchema.parse({ loanId: id, photoPath: 'g/loans/y.jpg', condition: 'ok' }).notes).toBe(''));
  it('rechaza estados desconocidos', () =>
    expect(returnSchema.safeParse({ loanId: id, photoPath: 'p', condition: 'roto' }).success).toBe(false));
});
