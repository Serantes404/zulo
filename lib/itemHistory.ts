import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { madridShortDate, splitPage } from '@/lib/loanSummary';

export const HISTORY_PAGE_SIZE = 10;

export type HistoryRow = {
  id: string;
  name: string | null;
  quantity: number;
  returnCondition: string | null;
  returnedDate: string | null;
};

/** Devoluciones de un material, más recientes primero. RLS decide qué filas se ven. */
export async function fetchHistory(
  supabase: SupabaseClient<Database>,
  itemId: string,
  offset: number,
): Promise<{ rows: HistoryRow[]; hasMore: boolean } | { error: string }> {
  const { data, error } = await supabase
    .from('loans')
    .select('id, quantity, returned_at, return_condition, profiles(full_name)')
    .eq('item_id', itemId)
    .eq('status', 'returned')
    .order('returned_at', { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE); // size + 1 filas: la extra marca "hay más"
  if (error) return { error: 'No se ha podido cargar el historial.' };
  const page = splitPage(data ?? [], HISTORY_PAGE_SIZE);
  return {
    hasMore: page.hasMore,
    rows: page.rows.map((l) => ({
      id: l.id,
      name: l.profiles?.full_name ?? null,
      quantity: l.quantity,
      returnCondition: l.return_condition,
      returnedDate: l.returned_at ? madridShortDate(l.returned_at) : null,
    })),
  };
}
