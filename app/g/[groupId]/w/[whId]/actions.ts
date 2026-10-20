'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { zoneInWarehouse } from '@/lib/ownership';
import { itemSchema } from '@/lib/schemas';
import { rpcErrorMessage } from '@/lib/errors';

export type CreateItemResult = { ok: true } | { error: string };

export async function createItem(groupId: string, warehouseId: string, zoneId: string, formData: FormData): Promise<CreateItemResult> {
  const p = itemSchema.safeParse({
    name: formData.get('name'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes') || undefined,
  });
  if (!p.success) return { error: 'Revisa el nombre (hasta 80 caracteres) y la cantidad (de 1 a 9999).' };
  // Sin try/catch: el redirect de requireUser() a /login debe llegar a Next.
  const { supabase } = await requireUser();
  if (!(await zoneInWarehouse(supabase, groupId, warehouseId, zoneId))) return { error: 'No tienes permiso para hacer esto.' };
  const { error } = await supabase
    .from('items')
    .insert({ zone_id: zoneId, name: p.data.name, quantity_total: p.data.quantity, notes: p.data.notes ?? null });
  if (error) return { error: rpcErrorMessage(error.message, 'No se ha podido añadir el material. Inténtalo de nuevo.') };
  revalidatePath(`/g/${groupId}/w/${warehouseId}`);
  return { ok: true };
}
