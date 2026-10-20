import { describe, it, expect } from 'vitest';
import { rpcErrorMessage, quantityBelowLentMessage } from './errors';

describe('rpcErrorMessage', () => {
  it('traduce códigos conocidos', () => expect(rpcErrorMessage('NOT_ENOUGH_AVAILABLE')).toMatch(/unidades/));
  it('encuentra el código dentro de un mensaje más largo', () => expect(rpcErrorMessage('ERROR: FORBIDDEN (P0001)')).toMatch(/permiso/));
  it('mensaje genérico si no lo reconoce', () => expect(rpcErrorMessage('boom')).toBe('Algo ha fallado. Inténtalo de nuevo.'));
  it('acepta undefined', () => expect(rpcErrorMessage(undefined)).toBe('Algo ha fallado. Inténtalo de nuevo.'));
});

describe('códigos de la migración de seguridad', () => {
  it('BAD_PHOTO', () => expect(rpcErrorMessage('ERROR: BAD_PHOTO')).toBe('La foto no es válida. Vuelve a hacerla.'));
  it('QUANTITY_BELOW_LENT sin número', () =>
    expect(rpcErrorMessage('QUANTITY_BELOW_LENT')).toBe('No puedes bajar el total por debajo de las unidades prestadas.'));
  it('quantityBelowLentMessage con número', () =>
    expect(quantityBelowLentMessage(3)).toBe('No puedes bajar el total por debajo de las unidades prestadas (3).'));
  it('límites de grupos, almacenes y material', () => {
    expect(rpcErrorMessage('GROUP_LIMIT')).toBe('Has llegado al máximo de 5 grupos creados.');
    expect(rpcErrorMessage('WAREHOUSE_LIMIT')).toBe('Este grupo ya tiene el máximo de 20 almacenes.');
    expect(rpcErrorMessage('ITEM_LIMIT')).toBe('Este grupo ya tiene el máximo de 2000 materiales.');
  });
});

it('rpcErrorMessage acepta un mensaje genérico propio', () => {
  expect(rpcErrorMessage('boom', 'No se ha podido crear el grupo.')).toBe('No se ha podido crear el grupo.');
  expect(rpcErrorMessage('GROUP_LIMIT', 'x')).toBe('Has llegado al máximo de 5 grupos creados.');
});
