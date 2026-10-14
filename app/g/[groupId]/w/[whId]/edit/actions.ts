'use server';
import { revalidatePath } from 'next/cache';
import { imageSize } from 'image-size';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { detectZonesFromImage, type DetectResult } from '@/lib/ai/detectZones';
import { clampZone, validateZones, type EditableZone } from '@/lib/zones';

async function requireAdmin(groupId: string) {
  const ctx = await requireUser();
  if ((await getRole(ctx.supabase, groupId, ctx.user.id)) !== 'admin') throw new Error('FORBIDDEN');
  return ctx;
}

export async function setPlanImage(
  groupId: string,
  warehouseId: string,
  path: string,
  aspectRatio: number,
): Promise<{ url: string } | { error: string }> {
  const { supabase } = await requireAdmin(groupId);
  if (!path.startsWith(`${groupId}/plans/`) || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { error: 'Foto no válida.' };
  }
  const { error } = await supabase
    .from('warehouses')
    .update({ plan_image_path: path, aspect_ratio: aspectRatio })
    .eq('id', warehouseId)
    .eq('group_id', groupId);
  if (error) return { error: 'No se ha podido guardar la foto del plano.' };
  const urls = await signedUrls(supabase, [path]);
  return urls[path] ? { url: urls[path] } : { error: 'No se ha podido cargar la foto.' };
}

export async function detectZonesAction(groupId: string, warehouseId: string): Promise<DetectResult> {
  const { supabase } = await requireAdmin(groupId);
  const { data: wh } = await supabase
    .from('warehouses')
    .select('plan_image_path')
    .eq('id', warehouseId)
    .eq('group_id', groupId)
    .single();
  if (!wh?.plan_image_path) return { ok: false, reason: 'NO_ZONES' };
  const { data: blob, error } = await supabase.storage.from('photos').download(wh.plan_image_path);
  if (error || !blob) return { ok: false, reason: 'UNAVAILABLE' };
  const buf = Buffer.from(await blob.arrayBuffer());
  const { width, height } = imageSize(buf);
  if (!width || !height) return { ok: false, reason: 'UNAVAILABLE' };
  return detectZonesFromImage(buf.toString('base64'), { width, height });
}

export async function saveZones(
  groupId: string,
  warehouseId: string,
  zones: EditableZone[],
): Promise<{ ok: true } | { error: string }> {
  const invalid = validateZones(zones);
  if (invalid) return { error: invalid };
  const { supabase } = await requireAdmin(groupId);

  const { data: existing } = await supabase.from('zones').select('id, label').eq('warehouse_id', warehouseId);
  const existingIds = new Set((existing ?? []).map((z) => z.id));
  // Solo se actualizan zonas de este almacén: un id ajeno movería esa zona aquí.
  if (zones.some((z) => z.id && !existingIds.has(z.id))) return { error: 'Hay una zona que no es de este almacén.' };
  const keep = new Set(zones.filter((z) => z.id).map((z) => z.id));
  const toDelete = (existing ?? []).filter((z) => !keep.has(z.id));

  if (toDelete.length > 0) {
    const ids = toDelete.map((z) => z.id);
    const { data: withItems } = await supabase.from('items').select('zone_id').in('zone_id', ids);
    const blocked = toDelete.filter((z) => withItems?.some((i) => i.zone_id === z.id));
    if (blocked.length > 0) {
      return {
        error: `Mueve o borra el material de ${blocked.map((z) => `«${z.label}»`).join(', ')} antes de eliminar esas zonas.`,
      };
    }
    const { error } = await supabase.from('zones').delete().in('id', ids);
    if (error) return { error: 'No se han podido borrar las zonas.' };
  }

  const rows = zones.map(clampZone).map((z) => ({
    id: z.id,
    warehouse_id: warehouseId,
    label: z.label.trim(),
    color: z.color,
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
  }));
  const updates = rows.filter((r) => r.id).map((r) => ({ ...r, id: r.id as string }));
  const inserts = rows.filter((r) => !r.id).map(({ id: _id, ...r }) => r);

  if (updates.length > 0) {
    const { error } = await supabase.from('zones').upsert(updates);
    if (error) return { error: 'No se han podido guardar los cambios.' };
  }
  if (inserts.length > 0) {
    const { error } = await supabase.from('zones').insert(inserts);
    if (error) return { error: 'No se han podido crear las zonas nuevas.' };
  }

  revalidatePath(`/g/${groupId}/w/${warehouseId}`);
  return { ok: true };
}
