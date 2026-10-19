import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database>;

// Defensa en profundidad: RLS ya lo impide, pero las acciones no deben fiarse solo de ello.
export async function warehouseInGroup(supabase: Client, groupId: string, warehouseId: string): Promise<boolean> {
  const { data } = await supabase
    .from('warehouses')
    .select('id')
    .eq('id', warehouseId)
    .eq('group_id', groupId)
    .maybeSingle();
  return !!data;
}

export async function zoneInWarehouse(
  supabase: Client,
  groupId: string,
  warehouseId: string,
  zoneId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('zones')
    .select('id, warehouses!inner(group_id)')
    .eq('id', zoneId)
    .eq('warehouse_id', warehouseId)
    .eq('warehouses.group_id', groupId)
    .maybeSingle();
  return !!data;
}
