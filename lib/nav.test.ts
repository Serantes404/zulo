import { describe, it, expect } from 'vitest';
import { initials, tabHref, isTabActive } from './nav';

describe('tabHref', () => {
  it('Almacenes, Préstamos y Grupo', () => {
    expect(tabHref('almacenes', 'g1', '/g/g1')).toBe('/g/g1');
    expect(tabHref('prestamos', 'g1', '/g/g1')).toBe('/g/g1/prestamos');
    expect(tabHref('grupo', 'g1', '/g/g1/w/w1')).toBe('/g/g1#miembros');
  });
  it('Buscar apunta al almacén actual con #buscar', () => {
    expect(tabHref('buscar', 'g1', '/g/g1/w/w1')).toBe('/g/g1/w/w1#buscar');
    expect(tabHref('buscar', 'g1', '/g/g1/w/w1/edit')).toBe('/g/g1/w/w1#buscar');
  });
  it('Buscar fuera de un almacén cae a la página del grupo', () => {
    expect(tabHref('buscar', 'g1', '/g/g1')).toBe('/g/g1');
    expect(tabHref('buscar', 'g1', '/g/g1/prestamos')).toBe('/g/g1');
  });
});

describe('isTabActive', () => {
  it('Almacenes en el grupo y en sus almacenes', () => {
    expect(isTabActive('almacenes', 'g1', '/g/g1')).toBe(true);
    expect(isTabActive('almacenes', 'g1', '/g/g1/w/w1')).toBe(true);
    expect(isTabActive('almacenes', 'g1', '/g/g1/prestamos')).toBe(false);
  });
  it('Préstamos', () => {
    expect(isTabActive('prestamos', 'g1', '/g/g1/prestamos')).toBe(true);
    expect(isTabActive('prestamos', 'g1', '/g/g1')).toBe(false);
  });
  it('Buscar y Grupo no se pueden distinguir sin el hash', () => {
    expect(isTabActive('buscar', 'g1', '/g/g1/w/w1')).toBe(false);
    expect(isTabActive('grupo', 'g1', '/g/g1')).toBe(false);
  });
});

describe('initials', () => {
  it('usa nombre y apellido', () => {
    expect(initials('Santi Serantes', 'a@b.com')).toBe('SS');
    expect(initials('  ana  maría  lópez ', null)).toBe('AL');
  });
  it('una sola palabra', () => {
    expect(initials('santi', null)).toBe('S');
  });
  it('cae al email', () => {
    expect(initials(null, 'pepe@x.com')).toBe('P');
    expect(initials('', 'pepe@x.com')).toBe('P');
  });
  it('sin datos', () => {
    expect(initials(null, null)).toBe('?');
  });
});
