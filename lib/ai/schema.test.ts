import { describe, it, expect } from 'vitest';
import { parseAiContent } from './schema';

describe('parseAiContent', () => {
  it('acepta una respuesta válida', () => {
    const r = parseAiContent('{"zones":[{"label":"Cocina","box":[1,2,3,4]}]}');
    expect(r).toEqual([{ label: 'Cocina', box: [1, 2, 3, 4] }]);
  });
  it('devuelve null si no es JSON', () => {
    expect(parseAiContent('aquí tienes las zonas: ...')).toBeNull();
  });
  it('devuelve null si no hay zonas', () => {
    expect(parseAiContent('{"zones":[]}')).toBeNull();
  });
  it('devuelve null si la caja no tiene 4 números', () => {
    expect(parseAiContent('{"zones":[{"label":"A","box":[1,2,3]}]}')).toBeNull();
  });
  it('pone label vacío si falta', () => {
    expect(parseAiContent('{"zones":[{"box":[1,2,3,4]}]}')).toEqual([{ label: '', box: [1, 2, 3, 4] }]);
  });
});
