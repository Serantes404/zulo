import { describe, it, expect } from 'vitest';
import { mergeAvailability, zoneStatus, availabilityLabel, searchItems, type ItemRow } from './availability';

const item = (id: string, name: string, total = 3): ItemRow => ({
  id, name, zone_id: 'z1', quantity_total: total, notes: null, photo_path: null,
});

describe('mergeAvailability', () => {
  it('usa los datos de la vista', () => {
    const [r] = mergeAvailability([item('i1', 'Tienda')], [
      { item_id: 'i1', quantity_out: 2, quantity_available: 1, has_overdue: true },
    ]);
    expect(r).toMatchObject({ out: 2, available: 1, overdue: true });
  });
  it('si no hay fila en la vista, todo está disponible', () => {
    const [r] = mergeAvailability([item('i1', 'Tienda')], []);
    expect(r).toMatchObject({ out: 0, available: 3, overdue: false });
  });
});

describe('zoneStatus', () => {
  const base = mergeAvailability([item('i1', 'A')], [])[0];
  it('ok si no hay nada prestado', () => expect(zoneStatus([base])).toBe('ok'));
  it('out si hay algo prestado', () => expect(zoneStatus([{ ...base, out: 1 }])).toBe('out'));
  it('overdue tiene prioridad', () => expect(zoneStatus([{ ...base, out: 1 }, { ...base, overdue: true }])).toBe('overdue'));
  it('zona vacía es ok', () => expect(zoneStatus([])).toBe('ok'));
});

describe('availabilityLabel', () => {
  it('todo disponible', () => expect(availabilityLabel({ available: 3, quantity_total: 3 })).toBe('3 disponibles'));
  it('singular', () => expect(availabilityLabel({ available: 1, quantity_total: 1 })).toBe('1 disponible'));
  it('parcial', () => expect(availabilityLabel({ available: 1, quantity_total: 3 })).toBe('1 de 3 disponibles'));
});

describe('searchItems', () => {
  const items = [item('1', 'Linternas'), item('2', 'Tienda Quechua'), item('3', 'Cuerdas')];
  it('ignora mayúsculas y tildes', () => expect(searchItems(items, 'LINTÉRNAS').map((i) => i.id)).toEqual(['1']));
  it('busca por parte del nombre', () => expect(searchItems(items, 'que').map((i) => i.id)).toEqual(['2']));
  it('consulta vacía no devuelve nada', () => expect(searchItems(items, '  ')).toEqual([]));
});
