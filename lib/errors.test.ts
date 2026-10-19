import { describe, it, expect } from 'vitest';
import { rpcErrorMessage } from './errors';

describe('rpcErrorMessage', () => {
  it('traduce códigos conocidos', () => expect(rpcErrorMessage('NOT_ENOUGH_AVAILABLE')).toMatch(/unidades/));
  it('encuentra el código dentro de un mensaje más largo', () => expect(rpcErrorMessage('ERROR: FORBIDDEN (P0001)')).toMatch(/permiso/));
  it('mensaje genérico si no lo reconoce', () => expect(rpcErrorMessage('boom')).toBe('Algo ha fallado. Inténtalo de nuevo.'));
  it('acepta undefined', () => expect(rpcErrorMessage(undefined)).toBe('Algo ha fallado. Inténtalo de nuevo.'));
});
