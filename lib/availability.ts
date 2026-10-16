export type ItemRow = {
  id: string;
  name: string;
  zone_id: string;
  quantity_total: number;
  notes: string | null;
  photo_path: string | null;
};
export type AvailRow = {
  item_id: string | null;
  quantity_out: number | null;
  quantity_available: number | null;
  has_overdue: boolean | null;
};
export type ItemWithAvail = ItemRow & { out: number; available: number; overdue: boolean };
export type ZoneStatus = 'overdue' | 'out' | 'ok';

export function mergeAvailability(items: ItemRow[], avail: AvailRow[]): ItemWithAvail[] {
  const byId = new Map(avail.filter((a) => a.item_id).map((a) => [a.item_id as string, a]));
  return items.map((i) => {
    const a = byId.get(i.id);
    return {
      ...i,
      out: a?.quantity_out ?? 0,
      available: a?.quantity_available ?? i.quantity_total,
      overdue: a?.has_overdue ?? false,
    };
  });
}

export function zoneStatus(items: ItemWithAvail[]): ZoneStatus {
  if (items.some((i) => i.overdue)) return 'overdue';
  if (items.some((i) => i.out > 0)) return 'out';
  return 'ok';
}

export function availabilityLabel(i: { available: number; quantity_total: number }): string {
  if (i.available === i.quantity_total) return `${i.available} disponible${i.available === 1 ? '' : 's'}`;
  return `${i.available} de ${i.quantity_total} disponibles`;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export function searchItems<T extends { name: string }>(items: T[], query: string): T[] {
  const q = fold(query);
  if (!q) return [];
  return items.filter((i) => fold(i.name).includes(q));
}
