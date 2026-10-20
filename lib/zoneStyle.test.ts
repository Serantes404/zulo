import { describe, expect, it } from 'vitest';
import { PALETTE } from './zones';
import { zoneCssVars, zoneMark } from './zoneStyle';

describe('zoneCssVars', () => {
  it('da variables claras y oscuras para cada color guardado', () => {
    for (const c of PALETTE) {
      const v = zoneCssVars(c);
      expect(Object.keys(v)).toHaveLength(8);
      for (const val of Object.values(v)) expect(val).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
  it('Teja: claro #C2410C con texto blanco, oscuro #FB923C con tinta', () => {
    const v = zoneCssVars('#E4572E');
    expect(v['--zone-border']).toBe('#C2410C');
    expect(v['--zone-chip-text']).toBe('#FFFFFF');
    expect(v['--zone-border-dark']).toBe('#FB923C');
    expect(v['--zone-chip-text-dark']).toBe('#14161F');
  });
  it('un color desconocido usa el de reserva', () => {
    expect(zoneCssVars('#123456')['--zone-border']).toBe(zoneCssVars(PALETTE[7])['--zone-border']);
  });
});

describe('zoneMark', () => {
  it('mapea estados', () => {
    expect(zoneMark('ok')).toBeNull();
    expect(zoneMark('out')).toEqual({ text: 'Prestado', tone: 'warning' });
    expect(zoneMark('overdue')).toEqual({ text: 'Vencido', tone: 'danger' });
  });
});
