import { describe, it, expect } from 'vitest';
import { parseCredentials, authErrorMessage, MIN_PASSWORD } from './authForm';

const fd = (email: string, password: string) => {
  const f = new FormData();
  f.set('email', email);
  f.set('password', password);
  return f;
};

describe('parseCredentials', () => {
  it('acepta email y contraseña válidos y normaliza el email', () =>
    expect(parseCredentials(fd('  Ana@Club.ES ', 'secreto123'))).toEqual({
      ok: true,
      email: 'ana@club.es',
      password: 'secreto123',
    }));
  it('rechaza un email inválido', () =>
    expect(parseCredentials(fd('ana', 'secreto123'))).toEqual({ ok: false, error: 'Escribe un email válido.' }));
  it(`rechaza contraseñas de menos de ${MIN_PASSWORD} caracteres`, () =>
    expect(parseCredentials(fd('ana@club.es', '1234567'))).toEqual({
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    }));
  it('no recorta la contraseña', () =>
    expect(parseCredentials(fd('ana@club.es', ' secreto123 '))).toMatchObject({ password: ' secreto123 ' }));
  it('rechaza campos ausentes', () =>
    expect(parseCredentials(new FormData())).toMatchObject({ ok: false }));
});

describe('authErrorMessage', () => {
  it('credenciales incorrectas', () =>
    expect(authErrorMessage('invalid_credentials')).toBe('Email o contraseña incorrectos.'));
  it('usuario ya existente', () => {
    expect(authErrorMessage('user_already_exists')).toBe('Ya hay una cuenta con ese email. Entra con tu contraseña.');
    expect(authErrorMessage('email_exists')).toBe('Ya hay una cuenta con ese email. Entra con tu contraseña.');
  });
  it('contraseña débil', () =>
    expect(authErrorMessage('weak_password')).toBe('Esa contraseña es demasiado débil. Prueba con una más larga.'));
  it('demasiados intentos', () =>
    expect(authErrorMessage('over_request_rate_limit')).toBe('Demasiados intentos. Espera unos minutos.'));
  it('genérico para códigos desconocidos', () =>
    expect(authErrorMessage(undefined)).toBe('No se ha podido completar. Inténtalo de nuevo.'));
});
