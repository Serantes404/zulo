import { describe, it, expect } from 'vitest';
import { sortActive, toActiveCard, toReturnedCard, type LoanRow } from './myLoans';

const NOW = new Date('2026-10-20T10:00:00Z');

const row = (over: Partial<LoanRow> = {}): LoanRow => ({
  id: 'l1',
  quantity: 2,
  due_date: '2026-10-26',
  returned_at: null,
  return_condition: null,
  items: { id: 'i1', name: 'Cuerda 10 m', photo_path: 'g/p.jpg', zones: { label: 'Cuerdas', color: '#E4572E' } },
  ...over,
});

describe('toActiveCard', () => {
  it('mapea la fila y marca vencido con la fecha de Madrid', () => {
    const c = toActiveCard(row({ due_date: '2026-10-17' }), NOW);
    expect(c).toMatchObject({ id: 'l1', itemId: 'i1', itemName: 'Cuerda 10 m', quantity: 2, zoneLabel: 'Cuerdas', zoneColor: '#E4572E', photoPath: 'g/p.jpg', overdue: true, dueText: '17 oct' });
  });
  it('vence hoy no es vencido', () => {
    expect(toActiveCard(row({ due_date: '2026-10-20' }), NOW).overdue).toBe(false);
  });
});

describe('sortActive', () => {
  it('vencidos primero y después por fecha, sin mutar la entrada', () => {
    const cards = [
      toActiveCard(row({ id: 'a', due_date: '2026-10-22' }), NOW),
      toActiveCard(row({ id: 'b', due_date: '2026-10-18' }), NOW),
      toActiveCard(row({ id: 'c', due_date: '2026-10-19' }), NOW),
      toActiveCard(row({ id: 'd', due_date: '2026-10-21' }), NOW),
    ];
    const ids = sortActive(cards).map((c) => c.id);
    expect(ids).toEqual(['b', 'c', 'd', 'a']);
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('toReturnedCard', () => {
  it('usa la fecha de devolución en Madrid y la condición', () => {
    const c = toReturnedCard(row({ returned_at: '2026-10-19T23:30:00Z', return_condition: 'damaged' }));
    expect(c).toMatchObject({ id: 'l1', returnedText: '20 oct', condition: 'damaged' });
  });
  it('sin returned_at queda en null', () => {
    expect(toReturnedCard(row()).returnedText).toBeNull();
  });
});
