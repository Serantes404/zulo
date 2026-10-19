import { describe, it, expect } from 'vitest';
import { isPlanPath } from './planPath';

const g = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const id = '7a1d9e55-0c2b-4f6e-8d3a-9b8c7d6e5f40';

describe('isPlanPath', () => {
  it('acepta <grupo>/plans/<uuid>.jpg', () => expect(isPlanPath(g, `${g}/plans/${id}.jpg`)).toBe(true));
  it('rechaza otro grupo', () =>
    expect(isPlanPath(g, `1b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a/plans/${id}.jpg`)).toBe(false));
  it('rechaza ../', () => {
    expect(isPlanPath(g, `${g}/plans/../${id}.jpg`)).toBe(false);
    expect(isPlanPath(g, `${g}/plans/../../x/plans/${id}.jpg`)).toBe(false);
  });
  it('rechaza sin .jpg', () => expect(isPlanPath(g, `${g}/plans/${id}`)).toBe(false));
  it('rechaza .png', () => expect(isPlanPath(g, `${g}/plans/${id}.png`)).toBe(false));
  it('rechaza segmentos extra', () => {
    expect(isPlanPath(g, `${g}/plans/x/${id}.jpg`)).toBe(false);
    expect(isPlanPath(g, `${g}/plans/${id}.jpg/extra`)).toBe(false);
    expect(isPlanPath(g, `x/${g}/plans/${id}.jpg`)).toBe(false);
  });
  it('rechaza otra carpeta', () => expect(isPlanPath(g, `${g}/items/${id}.jpg`)).toBe(false));
  it('rechaza un nombre que no es uuid', () => expect(isPlanPath(g, `${g}/plans/x.jpg`)).toBe(false));
  it('rechaza un groupId que no es uuid', () => {
    expect(isPlanPath('abc', 'abc/plans/' + id + '.jpg')).toBe(false);
    expect(isPlanPath('.*', `.*/plans/${id}.jpg`)).toBe(false);
  });
});
