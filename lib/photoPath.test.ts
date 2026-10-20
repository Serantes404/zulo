import { describe, it, expect } from 'vitest';
import { photoPath, isPhotoPath } from './photoPath';
import { uuid } from './uuid';

describe('photoPath', () => {
  it('construye {group}/{kind}/{id}.jpg', () => {
    expect(photoPath('g1', 'loans', 'abc')).toBe('g1/loans/abc.jpg');
  });
  it('genera un id único si no se pasa', () => {
    const a = photoPath('g1', 'plans');
    const b = photoPath('g1', 'plans');
    expect(a).toMatch(/^g1\/plans\/[0-9a-f-]{36}\.jpg$/);
    expect(a).not.toBe(b);
  });
});

const g = '0b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const other = '1b9c2f1e-5d3a-4c8e-9a7b-1f2e3d4c5b6a';
const id = '7a1d9e55-0c2b-4f6e-8d3a-9b8c7d6e5f40';

describe('isPhotoPath', () => {
  it('acepta lo que genera photoPath para cada carpeta', () => {
    for (const kind of ['plans', 'items', 'loans'] as const) {
      expect(isPhotoPath(photoPath(g, kind), g, kind)).toBe(true);
    }
  });
  it('acepta lo que genera el fallback de uuid sin crypto.randomUUID', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(isPhotoPath(photoPath(g, 'loans', uuid()), g, 'loans')).toBe(true);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
  it("rechaza 'p'", () => expect(isPhotoPath('p', g, 'loans')).toBe(false));
  it('rechaza otro grupo', () => expect(isPhotoPath(`${other}/loans/${id}.jpg`, g, 'loans')).toBe(false));
  it('rechaza ../', () => expect(isPhotoPath(`${g}/loans/../${id}.jpg`, g, 'loans')).toBe(false));
  it('rechaza otra carpeta', () => {
    expect(isPhotoPath(`${g}/plans/${id}.jpg`, g, 'loans')).toBe(false);
    expect(isPhotoPath(`${g}/loans/${id}.jpg`, g, 'items')).toBe(false);
  });
  it('rechaza mayúsculas, sin .jpg o segmentos extra', () => {
    expect(isPhotoPath(`${g}/loans/${id.toUpperCase()}.jpg`, g, 'loans')).toBe(false);
    expect(isPhotoPath(`${g}/loans/${id}`, g, 'loans')).toBe(false);
    expect(isPhotoPath(`${g}/loans/${id}.jpg/x`, g, 'loans')).toBe(false);
    expect(isPhotoPath(`x/${g}/loans/${id}.jpg`, g, 'loans')).toBe(false);
  });
  it('rechaza un groupId que no es uuid', () => expect(isPhotoPath(`abc/loans/${id}.jpg`, 'abc', 'loans')).toBe(false));
  it('rechaza valores que no son string', () => expect(isPhotoPath(42 as unknown as string, g, 'loans')).toBe(false));
});
