'use server';
import { revalidatePath } from 'next/cache';
import { imageSize } from 'image-size';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { detectZonesFromImage, planTooLarge, quotaFailure, type DetectResult } from '@/lib/ai/detectZones';
import { validatePlanUpdate, MIN_ASPECT, MAX_ASPECT, parseStoredLayout, type PlanUpdate, type PlanSource } from '@/lib/layout';
import { isPlanPath } from '@/lib/planPath';
import { warehouseInGroup } from '@/lib/ownership';
import { clampZone, validateZones, type EditableZone } from '@/lib/zones';

async function requireAdmin(groupId: string) {
  const ctx = await requireUser();
  if ((await getRole(ctx.supabase, groupId, ctx.user.id)) !== 'admin') throw new Error('FORBIDDEN');
  return ctx;
}

const NO_PERMISSION = 'No tienes permiso para hacer esto.';

// No escribe nada: la imagen y el plano solo se guardan en saveZones.
export async function previewPlanImage(
  groupId: string,
  warehouseId: string,
  path: string,
  aspectRatio: number,
  source: PlanSource,
): Promise<{ url: string } | { error: string }> {
  const { supabase } = await requireAdmin(groupId);
  if (!(await warehouseInGroup(supabase, groupId, warehouseId))) return { error: NO_PERMISSION };
  if (
    !isPlanPath(groupId, path) ||
    !Number.isFinite(aspectRatio) ||
    aspectRatio < MIN_ASPECT ||
    aspectRatio > MAX_ASPECT ||
    (source !== 'sketch' && source !== 'photo')
  ) {
    return { error: 'Foto no válida.' };
  }
  const urls = await signedUrls(supabase, [path]);
  return urls[path] ? { url: urls[path] } : { error: 'No se ha podido cargar la foto.' };
}

export async function detectZonesAction(
  groupId: string,
  warehouseId: string,
  pending?: { path: string; source: PlanSource },
): Promise<DetectResult> {
  const { supabase } = await requireAdmin(groupId);
  if (!(await warehouseInGroup(supabase, groupId, warehouseId))) return { ok: false, reason: 'UNAVAILABLE' };
  let path: string | null | undefined;
  let source: string | null | undefined;
  if (pending) {
    if (!isPlanPath(groupId, pending.path) || (pending.source !== 'sketch' && pending.source !== 'photo')) {
      return { ok: false, reason: 'NO_ZONES' };
    }
    ({ path, source } = pending);
  } else {
    const { data: wh } = await supabase
      .from('warehouses')
      .select('plan_image_path, plan_source')
      .eq('id', warehouseId)
      .eq('group_id', groupId)
      .single();
    path = wh?.plan_image_path;
    source = wh?.plan_source;
  }
  if (!path) return { ok: false, reason: 'NO_ZONES' };
  // Una llamada = una unidad de cuota, aunque la detección reintente por dentro.
  const { error: quotaError } = await supabase.rpc('consume_ai_quota', { p_group: groupId });
  if (quotaError) return { ok: false, reason: quotaFailure(quotaError.message) };
  // Tamaño del objeto antes de descargarlo (el bucket no tiene límite propio).
  const slash = path.lastIndexOf('/');
  const { data: found } = await supabase.storage
    .from('photos')
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  const stored = found?.find((f) => f.name === path.slice(slash + 1));
  if (planTooLarge(stored?.metadata?.size)) return { ok: false, reason: 'TOO_LARGE' };
  const { data: blob, error } = await supabase.storage.from('photos').download(path);
  if (error || !blob) return { ok: false, reason: 'UNAVAILABLE' };
  if (planTooLarge(blob.size)) return { ok: false, reason: 'TOO_LARGE' };
  const buf = Buffer.from(await blob.arrayBuffer());
  const { width, height } = imageSize(buf);
  if (!width || !height) return { ok: false, reason: 'UNAVAILABLE' };
  return detectZonesFromImage(buf.toString('base64'), { width, height }, undefined, source === 'sketch' ? 'sketch' : 'photo');
}

export async function saveZones(
  groupId: string,
  warehouseId: string,
  zones: EditableZone[],
  plan?: PlanUpdate,
): Promise<{ ok: true } | { error: string }> {
  const invalid = validateZones(zones);
  if (invalid) return { error: invalid };
  if (plan) {
    const badPlan = validatePlanUpdate(plan);
    if (badPlan) return { error: badPlan };
    if (plan.image && !isPlanPath(groupId, plan.image.path)) return { error: 'Foto no válida.' };
  }
  const { supabase } = await requireAdmin(groupId);
  if (!(await warehouseInGroup(supabase, groupId, warehouseId))) return { error: NO_PERMISSION };

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
  }

  if (plan) {
    const { error } = await supabase
      .from('warehouses')
      .update({
        layout: plan.layout === null ? null : parseStoredLayout(plan.layout),
        aspect_ratio: plan.aspectRatio,
        ...(plan.image ? { plan_image_path: plan.image.path, plan_source: plan.image.source } : {}),
      })
      .eq('id', warehouseId)
      .eq('group_id', groupId);
    if (error) return { error: 'No se ha podido guardar el plano.' };
  }

  if (toDelete.length > 0) {
    const { error } = await supabase.from('zones').delete().in('id', toDelete.map((z) => z.id));
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
