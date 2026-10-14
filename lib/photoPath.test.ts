import { describe, it, expect } from 'vitest';
import { photoPath } from './photoPath';

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
