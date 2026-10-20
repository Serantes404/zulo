import { describe, expect, it } from 'vitest';
import { isLeavingNavigation } from './leaveGuard';

const loc = { origin: 'https://zulo.app', pathname: '/g/1/w/2/edit', search: '' };
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

describe('isLeavingNavigation', () => {
  it('detecta enlaces internos a otra ruta', () => {
    expect(isLeavingNavigation({ href: '/g/1' }, click, loc)).toBe(true);
    expect(isLeavingNavigation({ href: 'https://zulo.app/' }, click, loc)).toBe(true);
  });
  it('ignora hashes de la misma página', () => {
    expect(isLeavingNavigation({ href: '#contenido' }, click, loc)).toBe(false);
    expect(isLeavingNavigation({ href: '/g/1/w/2/edit#x' }, click, loc)).toBe(false);
  });
  it('ignora otro origen, target externo y descargas', () => {
    expect(isLeavingNavigation({ href: 'https://otro.com/' }, click, loc)).toBe(false);
    expect(isLeavingNavigation({ href: '/g/1', target: '_blank' }, click, loc)).toBe(false);
    expect(isLeavingNavigation({ href: '/f.png', download: true }, click, loc)).toBe(false);
    expect(isLeavingNavigation({ href: 'mailto:a@b.c' }, click, loc)).toBe(false);
  });
  it('ignora modificadores y botones no principales', () => {
    expect(isLeavingNavigation({ href: '/g/1' }, { ...click, ctrlKey: true }, loc)).toBe(false);
    expect(isLeavingNavigation({ href: '/g/1' }, { ...click, button: 1 }, loc)).toBe(false);
  });
});
