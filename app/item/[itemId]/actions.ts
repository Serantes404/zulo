'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { checkoutSchema, isUuid, itemSchema, returnSchema } from '@/lib/schemas';
import { BAD_PHOTO, NO_PERMISSION, rpcErrorMessage } from '@/lib/errors';
import { isPhotoPath } from '@/lib/photoPath';
import { itemGroupId, requireItemAdmin } from '@/lib/ownership';
import { safeNext } from '@/lib/safeNext';
import { fetchHistory, type HistoryRow } from '@/lib/itemHistory';
import { z } from 'zod';

export type { HistoryRow };

export type ActionResult = { ok: true } | { error: string };

export async function checkoutAction(input: unknown): Promise<ActionResult> {
  const p = checkoutSchema.safeParse(input);
  if (!p.success) {
    // Los errores de la fecha (pasada, inexistente, a más de un año) llevan su propio mensaje.
    const due = p.error.issues.find((i) => i.path[0] === 'dueDate');
    return { error: due?.message ?? 'Revisa los datos del formulario.' };
  }
  const { itemId, quantity, purpose, dueDate, photoPath } = p.data;
  const { supabase } = await requireUser();
  // La foto tiene que estar en <grupo del material>/loans/ (la RPC lo vuelve a comprobar).
  const groupId = await itemGroupId(supabase, itemId);
  if (!groupId) return { error: rpcErrorMessage('NOT_FOUND') };
  if (!isPhotoPath(photoPath, groupId, 'loans')) return { error: BAD_PHOTO };
  const { error } = await supabase.rpc('checkout_item', {
    p_item: itemId,
    p_quantity: quantity,
    p_purpose: purpose,
    p_due: dueDate,
    p_photo: photoPath,
  });
  if (error) {
    revalidatePath(`/item/${itemId}`);
    if (error.message.includes('NOT_ENOUGH_AVAILABLE')) {
      const { data } = await supabase.from('item_availability').select('quantity_available').eq('item_id', itemId).maybeSingle();
      return { error: `Solo quedan ${data?.quantity_available ?? 0} disponibles.` };
    }
    return { error: rpcErrorMessage(error.message) };
  }
  revalidatePath(`/item/${itemId}`);
  return { ok: true };
}

export async function updateItem(itemId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const p = itemSchema.safeParse({
    name: formData.get('name'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes') || undefined,
  });
  if (!p.success) return { error: 'Revisa el nombre y la cantidad.' };
  const { supabase } = await requireUser();
  const { data: a } = await supabase.from('item_availability').select('quantity_out').eq('item_id', itemId).maybeSingle();
  const out = a?.quantity_out ?? 0;
  if (p.data.quantity < out) return { error: `Hay ${out} unidades prestadas: la cantidad total no puede ser menor.` };
  const { error } = await supabase
    .from('items')
    .update({ name: p.data.name, quantity_total: p.data.quantity, notes: p.data.notes ?? null })
    .eq('id', itemId);
  if (error) return { error: 'No se han podido guardar los cambios.' };
  revalidatePath(`/item/${itemId}`);
  return { ok: true };
}

export async function deleteItem(itemId: string, backTo: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) return { error: rpcErrorMessage(error.message) };
  redirect(safeNext(backTo));
}

export async function setItemPhoto(itemId: string, path: string): Promise<ActionResult> {
  if (!isUuid(itemId)) return { error: NO_PERMISSION };
  const { supabase, user } = await requireUser();
  const groupId = await requireItemAdmin(supabase, user.id, itemId);
  if (!groupId) return { error: NO_PERMISSION };
  // Solo fotos de material de este grupo: una de préstamo puede mostrar personas.
  if (!isPhotoPath(path, groupId, 'items')) return { error: BAD_PHOTO };
  const { data, error } = await supabase.from('items').update({ photo_path: path }).eq('id', itemId).select('id');
  if (error || !data || data.length === 0) return { error: 'No se ha podido guardar la foto.' };
  revalidatePath(`/item/${itemId}`);
  return { ok: true };
}

export async function returnAction(input: unknown): Promise<ActionResult> {
  const p = returnSchema.safeParse(input);
  if (!p.success) return { error: 'Revisa los datos del formulario.' };
  const { loanId, photoPath, condition, notes } = p.data;
  const { supabase } = await requireUser();
  // Antes de devolver: de qué material y grupo es, para validar la foto y revalidar las páginas.
  const { data: loan } = await supabase
    .from('loans')
    .select('item_id, checkout_photo_path, items(zones(warehouses(group_id)))')
    .eq('id', loanId)
    .maybeSingle();
  const groupId = loan?.items?.zones?.warehouses?.group_id;
  if (!loan || !groupId) return { error: rpcErrorMessage('NOT_FOUND') };
  if (!isPhotoPath(photoPath, groupId, 'loans')) return { error: BAD_PHOTO };
  if (photoPath === loan.checkout_photo_path) return { error: 'La foto de devolución tiene que ser nueva, no la de salida.' };
  const { error } = await supabase.rpc('return_loan', {
    p_loan: loanId,
    p_photo: photoPath,
    p_condition: condition,
    p_notes: notes,
  });
  if (error) return { error: rpcErrorMessage(error.message) };
  revalidatePath(`/loan/${loanId}`);
  revalidatePath(`/item/${loan.item_id}`);
  revalidatePath(`/g/${groupId}/prestamos`);
  revalidatePath(`/g/${groupId}`);
  return { ok: true };
}

export async function loadHistoryAction(itemId: string, offset: number) {
  const p = z.object({ itemId: z.string().uuid(), offset: z.number().int().min(0).max(100000) }).safeParse({ itemId, offset });
  if (!p.success) return { error: 'No se ha podido cargar el historial.' } as const;
  const { supabase } = await requireUser();
  return fetchHistory(supabase, p.data.itemId, p.data.offset);
}
