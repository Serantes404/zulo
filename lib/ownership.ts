import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getRole } from '@/lib/auth';

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

/** Grupo al que pertenece un material, visto con RLS (null si no existe o no es de tus grupos). */
export async function itemGroupId(supabase: Client, itemId: string): Promise<string | null> {
  const { data } = await supabase
    .from('items')
    .select('id, zones!inner(warehouses!inner(group_id))')
    .eq('id', itemId)
    .maybeSingle();
  return data?.zones?.warehouses?.group_id ?? null;
}

/** Grupo del material si el usuario es admin de ese grupo; null en cualquier otro caso. */
export async function requireItemAdmin(supabase: Client, userId: string, itemId: string): Promise<string | null> {
  const groupId = await itemGroupId(supabase, itemId);
  if (!groupId) return null;
  return (await getRole(supabase, groupId, userId)) === 'admin' ? groupId : null;
}
