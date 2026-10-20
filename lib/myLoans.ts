import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { isOverdue } from '@/lib/dates';
import { formatShortDate, madridShortDate, splitPage } from '@/lib/loanSummary';
import { photoPaths } from '@/lib/itemPhotos';
import { signedUrls } from '@/lib/signed';

export const LOANS_PAGE_SIZE = 20;

export type LoanRow = {
  id: string;
  quantity: number;
  due_date: string;
  returned_at: string | null;
  return_condition: string | null;
  items: { id: string; name: string; photo_path: string | null; zones: { label: string; color: string } };
};

export type LoanCard = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  zoneLabel: string;
  zoneColor: string;
  photoPath: string | null;
  photoUrl: string | null;
  dueDate: string;
  dueText: string;
  overdue: boolean;
  returnedText: string | null;
  condition: string | null;
};

function toCard(r: LoanRow, overdue: boolean): LoanCard {
  return {
    id: r.id,
    itemId: r.items.id,
    itemName: r.items.name,
    quantity: r.quantity,
    zoneLabel: r.items.zones.label,
    zoneColor: r.items.zones.color,
    photoPath: r.items.photo_path,
    photoUrl: null,
    dueDate: r.due_date,
    dueText: formatShortDate(r.due_date),
    overdue,
    returnedText: r.returned_at ? madridShortDate(r.returned_at) : null,
    condition: r.return_condition,
  };
}

export const toActiveCard = (r: LoanRow, now: Date = new Date()): LoanCard => toCard(r, isOverdue(r.due_date, now));
export const toReturnedCard = (r: LoanRow): LoanCard => toCard(r, false);

/** Vencidos primero y después por fecha de devolución (YYYY-MM-DD se ordena como texto). */
export function sortActive(cards: LoanCard[]): LoanCard[] {
  return [...cards].sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate));
}

/** Añade photoUrl con una sola llamada de firmado para todas las tarjetas. */
export async function attachCardPhotos(supabase: SupabaseClient<Database>, cards: LoanCard[]): Promise<LoanCard[]> {
  const urls = await signedUrls(supabase, photoPaths(cards.map((c) => ({ photo_path: c.photoPath }))));
  return cards.map((c) => ({ ...c, photoUrl: c.photoPath ? urls[c.photoPath] ?? null : null }));
}

const SELECT =
  'id, quantity, due_date, returned_at, return_condition, items!inner(id, name, photo_path, zones!inner(label, color, warehouses!inner(group_id)))';

/** Préstamos activos del usuario en este grupo. Filtra por user_id además de RLS (los miembros ven todos). */
export async function fetchActiveLoans(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string,
): Promise<LoanCard[] | { error: string }> {
  const { data, error } = await supabase
    .from('loans')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('items.zones.warehouses.group_id', groupId)
    .order('due_date');
  if (error) return { error: 'No se han podido cargar tus préstamos.' };
  const now = new Date();
  return sortActive((data as unknown as LoanRow[]).map((r) => toActiveCard(r, now)));
}

/** Una página de devueltos (más recientes primero). Pide size + 1 filas: la extra marca "hay más". */
export async function fetchReturnedLoans(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string,
  offset: number,
): Promise<{ cards: LoanCard[]; hasMore: boolean } | { error: string }> {
  const { data, error } = await supabase
    .from('loans')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('status', 'returned')
    .eq('items.zones.warehouses.group_id', groupId)
    .order('returned_at', { ascending: false })
    .range(offset, offset + LOANS_PAGE_SIZE);
  if (error) return { error: 'No se han podido cargar los préstamos devueltos.' };
  const page = splitPage(data as unknown as LoanRow[], LOANS_PAGE_SIZE);
  return { hasMore: page.hasMore, cards: page.rows.map(toReturnedCard) };
}
