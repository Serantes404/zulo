import { describe, it, expect } from 'vitest';
import { looksLikeHeic, toBrowserImage } from './heic';

const file = (name: string, type: string) => new File(['x'], name, { type });

describe('looksLikeHeic', () => {
  it('detecta HEIC y HEIF por el tipo MIME', () => {
    expect(looksLikeHeic(file('a', 'image/heic'))).toBe(true);
    expect(looksLikeHeic(file('a', 'image/heif'))).toBe(true);
  });

  it('detecta HEIC por la extensión cuando el navegador no da tipo', () => {
    expect(looksLikeHeic(file('IMG_0001.HEIC', ''))).toBe(true);
    expect(looksLikeHeic(file('foto.heif', ''))).toBe(true);
  });

  it('no marca JPEG ni PNG', () => {
    expect(looksLikeHeic(file('foto.jpg', 'image/jpeg'))).toBe(false);
    expect(looksLikeHeic(file('plano.png', 'image/png'))).toBe(false);
  });
});

describe('toBrowserImage', () => {
  it('devuelve el mismo archivo si no es HEIC', async () => {
    const f = file('foto.jpg', 'image/jpeg');
    expect(await toBrowserImage(f)).toBe(f);
  });

  it('convierte HEIC a un JPEG con el mismo nombre y extensión .jpg', async () => {
    const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
    const r = await toBrowserImage(file('IMG_0001.HEIC', 'image/heic'), async () => jpeg);
    expect(r.name).toBe('IMG_0001.jpg');
    expect(r.type).toBe('image/jpeg');
  });
});
