import { describe, expect, it } from 'vitest';
import { PALETTE } from './zones';
import { zoneSwatch } from './zoneColors';

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAPERS_LIGHT = ['#F7F6F2', '#FAFAF7']; // --background y --plan-paper
const FLOOR_DARK = '#111A2E';

describe('zoneSwatch', () => {
  it('cubre las 8 zonas de PALETTE con nombres distintos', () => {
    const names = PALETTE.map((h) => zoneSwatch(h).name);
    expect(new Set(names).size).toBe(8);
    expect(names[0]).toBe('Teja');
    expect(names[7]).toBe('Pizarra');
  });

  it('devuelve los valores de la spec para Teja y Mostaza', () => {
    expect(zoneSwatch('#E4572E').light).toEqual({ fill: '#C2410C', border: '#C2410C', chipBg: '#C2410C', chipText: '#FFFFFF' });
    expect(zoneSwatch('#F2A541').light).toEqual({ fill: '#EAB308', border: '#A16207', chipBg: '#EAB308', chipText: '#14161F' });
    expect(zoneSwatch('#F2A541').dark.fill).toBe('#FACC15');
  });

  it('ignora mayúsculas y minúsculas', () => {
    expect(zoneSwatch('#e4572e')).toEqual(zoneSwatch('#E4572E'));
  });

  it('usa Pizarra para un hex desconocido sin lanzar', () => {
    expect(zoneSwatch('#123456').name).toBe('Pizarra');
    expect(zoneSwatch('').name).toBe('Pizarra');
  });

  describe.each(PALETTE.map((h) => [zoneSwatch(h).name, h]))('%s', (_n, hex) => {
    const s = zoneSwatch(hex);
    it('chip >= 4,5:1 en claro y oscuro', () => {
      expect(contrast(s.light.chipText, s.light.chipBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.dark.chipText, s.dark.chipBg)).toBeGreaterThanOrEqual(4.5);
    });
    it('borde >= 3:1 contra el suelo del plano en claro y oscuro', () => {
      for (const p of PAPERS_LIGHT) expect(contrast(s.light.border, p)).toBeGreaterThanOrEqual(3);
      expect(contrast(s.dark.border, FLOOR_DARK)).toBeGreaterThanOrEqual(3);
    });
  });
});
