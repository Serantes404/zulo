import { describe, it, expect } from 'vitest';
import { buildMaterialRows, groupByInitial, initialOf, materialHref } from './materialList';

const item = (id: string, name: string, zone_id = 'z1', quantity_total = 1) => ({
  id, name, zone_id, quantity_total, notes: null, photo_path: null,
});
const zones = [
  { id: 'z1', label: 'Estantería', color: '#2E86AB', warehouse_id: 'w1' },
  { id: 'z2', label: 'Armario', color: '#F18F01', warehouse_id: 'w2' },
];
const warehouses = [
  { id: 'w1', name: 'Local' },
  { id: 'w2', name: 'Sótano' },
];

describe('buildMaterialRows', () => {
  it('ordena alfabéticamente sin distinguir tildes ni mayúsculas, y los números de forma natural', () => {
    const rows = buildMaterialRows(
      [item('1', 'tienda'), item('2', 'Árbol'), item('3', 'Cuerda 10 m'), item('4', 'Cuerda 2 m'), item('5', 'ñu'), item('6', 'nudo')],
      zones, warehouses, [],
    );
    expect(rows.map((r) => r.name)).toEqual(['Árbol', 'Cuerda 2 m', 'Cuerda 10 m', 'nudo', 'ñu', 'tienda']);
  });
  it('añade almacén, zona y disponibilidad', () => {
    const [r] = buildMaterialRows(
      [item('1', 'Tienda', 'z2', 5)], zones, warehouses,
      [{ item_id: '1', quantity_out: 2, quantity_available: 3, has_overdue: true }],
    );
    expect(r).toMatchObject({
      available: 3, out: 2, overdue: true,
      zone: { id: 'z2', label: 'Armario' },
      warehouse: { id: 'w2', name: 'Sótano' },
    });
  });
  it('mismo nombre en dos almacenes: desempata por almacén', () => {
    const rows = buildMaterialRows([item('1', 'Tienda', 'z2'), item('2', 'Tienda', 'z1')], zones, warehouses, []);
    expect(rows.map((r) => r.warehouse.name)).toEqual(['Local', 'Sótano']);
  });
  it('descarta material cuya zona o almacén no llegó', () => {
    expect(buildMaterialRows([item('1', 'X', 'zz')], zones, warehouses, [])).toEqual([]);
  });
});

describe('initialOf', () => {
  it('letras, tildes, ñ y el resto', () => {
    expect(initialOf('árbol')).toBe('A');
    expect(initialOf('Ñu')).toBe('Ñ');
    expect(initialOf('2 cuerdas')).toBe('#');
    expect(initialOf('  ')).toBe('#');
  });
});

describe('groupByInitial', () => {
  it('una sección por letra en orden de aparición', () => {
    const g = groupByInitial([{ name: '1x' }, { name: 'Árbol' }, { name: 'arco' }, { name: 'Botas' }, { name: '#2' }]);
    expect(g.map((s) => [s.letter, s.rows.length])).toEqual([['#', 2], ['A', 2], ['B', 1]]);
  });
});

describe('materialHref', () => {
  it('lleva al almacén con zona e item', () => {
    expect(materialHref('g1', { id: 'i1', zone: { id: 'z1', label: '', color: '' }, warehouse: { id: 'w1', name: '' } }))
      .toBe('/g/g1/w/w1?zona=z1&item=i1');
  });
});
