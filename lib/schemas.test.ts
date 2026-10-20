import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { itemSchema, checkoutSchema, returnSchema } from './schemas';

const id = crypto.randomUUID();
const g = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const photo = `${g}/loans/7a1d9e55-0c2b-4f6e-8d3a-9b8c7d6e5f40.jpg`;

// "Hoy" en Madrid es 2026-10-20 durante estos tests.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('itemSchema', () => {
  it('limpia el nombre y convierte la cantidad', () =>
    expect(itemSchema.parse({ name: ' Linternas ', quantity: '20' })).toEqual({ name: 'Linternas', quantity: 20 }));
  it('rechaza cantidad 0', () => expect(itemSchema.safeParse({ name: 'A', quantity: '0' }).success).toBe(false));
  it('rechaza nombre vacío', () => expect(itemSchema.safeParse({ name: ' ', quantity: '1' }).success).toBe(false));
});

describe('checkoutSchema', () => {
  const ok = { itemId: id, quantity: 2, purpose: 'Campamento', dueDate: '2026-10-21', photoPath: photo };
  it('acepta datos válidos', () => expect(checkoutSchema.safeParse(ok).success).toBe(true));
  it('acepta hoy como fecha de devolución', () =>
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2026-10-20' }).success).toBe(true));
  it('rechaza fecha mal formada', () => expect(checkoutSchema.safeParse({ ...ok, dueDate: '21/10/2026' }).success).toBe(false));
  it('rechaza una fecha que no existe', () => {
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2026-02-31' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2026-13-01' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2026-00-10' }).success).toBe(false);
  });
  it('rechaza una fecha anterior a hoy en Madrid', () =>
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2026-10-19' }).success).toBe(false));
  it('rechaza una fecha a más de un año', () => {
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '9999-12-31' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2027-10-21' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, dueDate: '2027-10-20' }).success).toBe(true);
  });
  it('rechaza cantidades no enteras, enormes o 0', () => {
    expect(checkoutSchema.safeParse({ ...ok, quantity: 1e10 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, quantity: 10000 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, quantity: 1.5 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, quantity: 0 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, quantity: 9999 }).success).toBe(true);
  });
  it('rechaza sin foto o con una ruta que no es de préstamo', () => {
    expect(checkoutSchema.safeParse({ ...ok, photoPath: '' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, photoPath: 'p' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, photoPath: photo.replace('/loans/', '/items/') }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, photoPath: `${g}/loans/../x.jpg` }).success).toBe(false);
  });
});

describe('returnSchema', () => {
  it('pone notas vacías por defecto', () =>
    expect(returnSchema.parse({ loanId: id, photoPath: photo, condition: 'ok' }).notes).toBe(''));
  it('rechaza estados desconocidos', () =>
    expect(returnSchema.safeParse({ loanId: id, photoPath: photo, condition: 'roto' }).success).toBe(false));
  it('rechaza una ruta de foto que no es de préstamo', () =>
    expect(returnSchema.safeParse({ loanId: id, photoPath: 'p', condition: 'ok' }).success).toBe(false));
});
