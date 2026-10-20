import { describe, it, expect } from 'vitest';
import { summarizeWarehouse } from './warehouseSummary';

const zones = [{ id: 'z1' }, { id: 'z2' }];

describe('summarizeWarehouse', () => {
  it('"Sin plano" si no tiene zonas', () => {
    expect(summarizeWarehouse([], [])).toEqual({ zoneCount: 0, outCount: 0, subtitle: 'Sin plano' });
  });

  it('cuenta zonas y materiales prestados solo de sus zonas', () => {
    const avail = [
      { zone_id: 'z1', quantity_out: 2 },
      { zone_id: 'z2', quantity_out: 0 },
      { zone_id: 'z2', quantity_out: 1 },
      { zone_id: 'otra', quantity_out: 5 },
      { zone_id: null, quantity_out: 5 },
    ];
    expect(summarizeWarehouse(zones, avail)).toEqual({ zoneCount: 2, outCount: 2, subtitle: '2 zonas · 2 prestados' });
  });

  it('singular y cero prestados', () => {
    expect(summarizeWarehouse([{ id: 'z1' }], []).subtitle).toBe('1 zona · 0 prestados');
    expect(summarizeWarehouse([{ id: 'z1' }], [{ zone_id: 'z1', quantity_out: 1 }]).subtitle).toBe('1 zona · 1 prestado');
  });
});
