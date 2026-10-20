import { describe, it, expect } from 'vitest';
import { uploadErrorMessage, UPLOAD_LIMIT, UPLOAD_TOO_BIG } from './uploadErrors';

const FALLBACK = 'No se ha podido subir la foto. Inténtalo de nuevo.';
// Forma de StorageApiError de @supabase/storage-js: status HTTP numérico y statusCode en texto.
const storageError = (message: string, status: number, statusCode: string) =>
  Object.assign(new Error(message), { name: 'StorageApiError', __isStorageError: true, status, statusCode });

describe('uploadErrorMessage', () => {
  it('403 o violación de RLS → límite diario de fotos', () => {
    expect(uploadErrorMessage(storageError('new row violates row-level security policy', 400, '403'), FALLBACK)).toBe(UPLOAD_LIMIT);
    expect(uploadErrorMessage(storageError('Forbidden', 403, '403'), FALLBACK)).toBe(UPLOAD_LIMIT);
    expect(uploadErrorMessage(storageError('new row violates row-level security policy for table "objects"', 400, '400'), FALLBACK)).toBe(UPLOAD_LIMIT);
  });
  it('413 o MIME no válido → demasiado grande o no es JPEG', () => {
    expect(uploadErrorMessage(storageError('The object exceeded the maximum allowed size', 413, '413'), FALLBACK)).toBe(UPLOAD_TOO_BIG);
    expect(uploadErrorMessage(storageError('Payload too large', 400, '413'), FALLBACK)).toBe(UPLOAD_TOO_BIG);
    expect(uploadErrorMessage(storageError('mime type image/png is not supported', 400, '415'), FALLBACK)).toBe(UPLOAD_TOO_BIG);
    expect(uploadErrorMessage(storageError('invalid_mime_type', 400, '400'), FALLBACK)).toBe(UPLOAD_TOO_BIG);
  });
  it('el resto conserva el mensaje de siempre', () => {
    expect(uploadErrorMessage(storageError('Internal', 500, '500'), FALLBACK)).toBe(FALLBACK);
    expect(uploadErrorMessage(new Error('heic'), FALLBACK)).toBe(FALLBACK);
    expect(uploadErrorMessage('x', FALLBACK)).toBe(FALLBACK);
    expect(uploadErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });
  it('los textos son los acordados', () => {
    expect(UPLOAD_LIMIT).toBe('No se ha podido subir la foto. Puede que el grupo haya llegado al límite de fotos de hoy (500); inténtalo mañana.');
    expect(UPLOAD_TOO_BIG).toBe('La foto es demasiado grande o no es una imagen JPEG.');
  });
});
