import { describe, it, expect } from 'vitest';
import { defaultDueDate, toISODate, isOverdue } from './dates';

describe('dates', () => {
  it('defaultDueDate suma 7 días', () => expect(defaultDueDate(new Date(2026, 9, 14))).toBe('2026-10-21'));
  it('cruza de mes', () => expect(defaultDueDate(new Date(2026, 9, 28))).toBe('2026-11-04'));
  it('toISODate rellena con ceros', () => expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05'));
  it('isOverdue compara con hoy', () => {
    const today = new Date(2026, 9, 14);
    expect(isOverdue('2026-10-13', today)).toBe(true);
    expect(isOverdue('2026-10-14', today)).toBe(false);
  });
});
