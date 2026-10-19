'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { zoneInWarehouse } from '@/lib/ownership';
import { itemSchema } from '@/lib/schemas';

export async function createItem(groupId: string, warehouseId: string, zoneId: string, formData: FormData) {
  const p = itemSchema.safeParse({
    name: formData.get('name'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes') || undefined,
  });
  if (!p.success) return;
  const { supabase } = await requireUser();
  if (!(await zoneInWarehouse(supabase, groupId, warehouseId, zoneId))) throw new Error('No tienes permiso para hacer esto.');
  const { error } = await supabase
    .from('items')
    .insert({ zone_id: zoneId, name: p.data.name, quantity_total: p.data.quantity, notes: p.data.notes ?? null });
  if (error) throw new Error('No se ha podido añadir el material');
  revalidatePath(`/g/${groupId}/w/${warehouseId}`);
}
