import { describe, it, expect, vi, afterEach } from 'vitest';
import { uuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('uuid', () => {
  it('devuelve un UUID v4', () => {
    expect(uuid()).toMatch(V4);
  });

  it('funciona sin crypto.randomUUID (http en el móvil no es contexto seguro)', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const a = uuid();
    const b = uuid();
    expect(a).toMatch(V4);
    expect(a).not.toBe(b);
  });
});
