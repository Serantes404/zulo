import { describe, it, expect } from 'vitest';
import { soonestDue, formatShortDate, outSummary, madridShortDate, splitPage } from './loanSummary';

describe('soonestDue', () => {
  it('devuelve null sin préstamos', () => expect(soonestDue([])).toBeNull());
  it('elige la fecha más próxima', () => {
    expect(soonestDue([{ due_date: '2026-10-25' }, { due_date: '2026-10-21' }, { due_date: '2026-11-02' }])).toBe('2026-10-21');
  });
});

describe('formatShortDate', () => {
  it('formatea día y mes abreviado en español', () => {
    expect(formatShortDate('2026-10-21')).toBe('21 oct');
    expect(formatShortDate('2026-01-05')).toBe('5 ene');
    expect(formatShortDate('2026-12-31')).toBe('31 dic');
  });
});

describe('outSummary', () => {
  it('sin préstamos activos', () => expect(outSummary(0, null)).toBe('Ninguna prestada'));
  it('singular', () => expect(outSummary(1, '2026-10-21')).toBe('1 prestada · vence 21 oct'));
  it('plural', () => expect(outSummary(3, '2026-10-21')).toBe('3 prestadas · vence 21 oct'));
});

describe('madridShortDate', () => {
  it('usa el día de Madrid, no el de UTC', () => {
    expect(madridShortDate('2026-10-20T22:30:00Z')).toBe('21 oct');
    expect(madridShortDate('2026-10-20T12:00:00Z')).toBe('20 oct');
  });
});

describe('splitPage', () => {
  it('sin más páginas', () => expect(splitPage([1, 2, 3], 10)).toEqual({ rows: [1, 2, 3], hasMore: false }));
  it('con página justa no hay más', () => expect(splitPage([1, 2], 2)).toEqual({ rows: [1, 2], hasMore: false }));
  it('con una fila extra hay más y se recorta', () => expect(splitPage([1, 2, 3], 2)).toEqual({ rows: [1, 2], hasMore: true }));
});
