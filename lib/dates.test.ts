import { describe, it, expect } from 'vitest';
import { defaultDueDate, toISODate, isOverdue, todayInMadrid } from './dates';

describe('dates', () => {
  it('toISODate rellena con ceros', () => expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05'));

  describe('todayInMadrid', () => {
    it('a mediodía UTC es el mismo día', () => {
      expect(todayInMadrid(new Date('2026-10-20T12:00:00Z'))).toBe('2026-10-20');
    });
    it('22:30 UTC en horario de verano ya es el día siguiente en Madrid', () => {
      expect(todayInMadrid(new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-21');
    });
    it('en horario de invierno el día cambia a las 23:00 UTC', () => {
      expect(todayInMadrid(new Date('2026-11-20T22:30:00Z'))).toBe('2026-11-20');
      expect(todayInMadrid(new Date('2026-11-20T23:30:00Z'))).toBe('2026-11-21');
    });
    it('cambio de hora del 2026-03-29 (01:00Z pasa a UTC+2)', () => {
      expect(todayInMadrid(new Date('2026-03-28T22:59:00Z'))).toBe('2026-03-28');
      expect(todayInMadrid(new Date('2026-03-28T23:00:00Z'))).toBe('2026-03-29');
      expect(todayInMadrid(new Date('2026-03-29T21:59:00Z'))).toBe('2026-03-29');
      expect(todayInMadrid(new Date('2026-03-29T22:00:00Z'))).toBe('2026-03-30');
    });
  });

  describe('defaultDueDate', () => {
    it('suma 7 días', () => expect(defaultDueDate(new Date('2026-10-14T12:00:00Z'))).toBe('2026-10-21'));
    it('cruza de mes', () => expect(defaultDueDate(new Date('2026-10-28T12:00:00Z'))).toBe('2026-11-04'));
    it('parte del día de Madrid, no del de UTC', () => {
      expect(defaultDueDate(new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-28');
    });
    it('cruza el cambio de hora sin perder un día', () => {
      expect(defaultDueDate(new Date('2026-03-25T12:00:00Z'))).toBe('2026-04-01');
      expect(defaultDueDate(new Date('2026-10-20T12:00:00Z'), 10)).toBe('2026-10-30');
    });
  });

  describe('isOverdue', () => {
    it('compara con hoy en Madrid', () => {
      const now = new Date('2026-10-14T12:00:00Z');
      expect(isOverdue('2026-10-13', now)).toBe(true);
      expect(isOverdue('2026-10-14', now)).toBe(false);
    });
    it('a las 22:30 UTC el día de Madrid ya ha cambiado', () => {
      const now = new Date('2026-10-20T22:30:00Z');
      expect(isOverdue('2026-10-20', now)).toBe(true);
      expect(isOverdue('2026-10-21', now)).toBe(false);
    });
  });
});
