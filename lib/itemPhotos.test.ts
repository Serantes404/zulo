import { describe, it, expect } from 'vitest';
import { attachPhotoUrls, photoPaths } from './itemPhotos';

describe('photoPaths', () => {
  it('devuelve rutas únicas y descarta las vacías', () => {
    const items = [{ photo_path: 'a.jpg' }, { photo_path: null }, { photo_path: 'a.jpg' }, { photo_path: 'b.jpg' }];
    expect(photoPaths(items)).toEqual(['a.jpg', 'b.jpg']);
  });
  it('lista vacía', () => expect(photoPaths([])).toEqual([]));
});

describe('attachPhotoUrls', () => {
  it('asigna la URL firmada de cada ruta y null si falta', () => {
    const items = [
      { id: '1', photo_path: 'a.jpg' },
      { id: '2', photo_path: null },
      { id: '3', photo_path: 'sin-firmar.jpg' },
    ];
    const out = attachPhotoUrls(items, { 'a.jpg': 'https://x/a' });
    expect(out.map((i) => i.photoUrl)).toEqual(['https://x/a', null, null]);
    expect(out[0].id).toBe('1');
  });
});
