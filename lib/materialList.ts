import { mergeAvailability, type AvailRow, type ItemRow } from './availability';

type ZoneRow = { id: string; label: string; color: string; warehouse_id: string };
type WarehouseRow = { id: string; name: string };

export type MaterialRow = {
  id: string;
  name: string;
  quantity_total: number;
  available: number;
  out: number;
  overdue: boolean;
  zone: { id: string; label: string; color: string };
  warehouse: { id: string; name: string };
};

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Todo el material del grupo con su almacén y zona, en orden alfabético (á = a, ñ tras n, "2" antes de "10"). */
export function buildMaterialRows(
  items: ItemRow[],
  zones: ZoneRow[],
  warehouses: WarehouseRow[],
  avail: AvailRow[],
): MaterialRow[] {
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const whById = new Map(warehouses.map((w) => [w.id, w]));
  const rows: MaterialRow[] = [];
  for (const i of mergeAvailability(items, avail)) {
    const z = zoneById.get(i.zone_id);
    const w = z && whById.get(z.warehouse_id);
    if (!z || !w) continue;
    rows.push({
      id: i.id,
      name: i.name,
      quantity_total: i.quantity_total,
      available: i.available,
      out: i.out,
      overdue: i.overdue,
      zone: { id: z.id, label: z.label, color: z.color },
      warehouse: { id: w.id, name: w.name },
    });
  }
  return rows.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.warehouse.name, b.warehouse.name));
}

/** Letra del índice: la inicial sin tilde en mayúscula ("Ñ" se mantiene); números y símbolos van a "#". */
export function initialOf(name: string): string {
  const first = name.trim().charAt(0);
  if (!first) return '#';
  if (first.toLowerCase() === 'ñ') return 'Ñ';
  const base = first.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
  return /^[A-Z]$/.test(base) ? base : '#';
}

/** Agrupa filas ya ordenadas por su inicial (una sola sección por letra, en orden de aparición). */
export function groupByInitial<T extends { name: string }>(rows: T[]): { letter: string; rows: T[] }[] {
  const byLetter = new Map<string, T[]>();
  for (const r of rows) {
    const letter = initialOf(r.name);
    const list = byLetter.get(letter);
    if (list) list.push(r);
    else byLetter.set(letter, [r]);
  }
  return [...byLetter].map(([letter, rows]) => ({ letter, rows }));
}

/** Enlace al almacén con la zona abierta y el material resaltado. */
export function materialHref(groupId: string, r: Pick<MaterialRow, 'id' | 'zone' | 'warehouse'>): string {
  return `/g/${groupId}/w/${r.warehouse.id}?zona=${encodeURIComponent(r.zone.id)}&item=${encodeURIComponent(r.id)}`;
}
