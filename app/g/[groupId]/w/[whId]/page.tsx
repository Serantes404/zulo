import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { mergeAvailability } from '@/lib/availability';
import { PlanView } from '@/components/PlanView';
import { DEFAULT_LAYOUT, parseStoredLayout } from '@/lib/layout';

type Params = Promise<{ groupId: string; whId: string }>;

export default function WarehousePage({ params }: { params: Params }) {
  return (
    // Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>.
    <Suspense fallback={<p className="p-4 text-muted-foreground">Cargando…</p>}>
      <Warehouse params={params} />
    </Suspense>
  );
}

async function Warehouse({ params }: { params: Params }) {
  const { groupId, whId } = await params;
  const { supabase, user } = await requireUser();
  const role = await getRole(supabase, groupId, user.id);
  if (!role) notFound();
  const isAdmin = role === 'admin';

  const { data: wh } = await supabase
    .from('warehouses')
    .select('id, name, plan_image_path, aspect_ratio, plan_source, layout')
    .eq('id', whId)
    .eq('group_id', groupId)
    .single();
  if (!wh) notFound();

  const { data: zones } = await supabase
    .from('zones')
    .select('id, label, color, x, y, w, h')
    .eq('warehouse_id', whId)
    .order('created_at');
  const zoneIds = (zones ?? []).map((z) => z.id);

  const [{ data: items }, { data: avail }] = await Promise.all([
    supabase.from('items').select('id, name, zone_id, quantity_total, notes, photo_path').in('zone_id', zoneIds).order('name'),
    supabase.from('item_availability').select('item_id, quantity_out, quantity_available, has_overdue').in('zone_id', zoneIds),
  ]);
  const urls = await signedUrls(supabase, wh.plan_image_path ? [wh.plan_image_path] : []);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link href={`/g/${groupId}`} className="text-sm underline">← Volver al grupo</Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{wh.name}</h1>
        {isAdmin && <Link href={`/g/${groupId}/w/${whId}/edit`} className="text-sm underline">Editar plano</Link>}
      </div>
      {zoneIds.length === 0 ? (
        <p className="text-muted-foreground">
          Este almacén aún no tiene plano.{' '}
          {isAdmin ? <Link href={`/g/${groupId}/w/${whId}/edit`} className="underline">Crearlo ahora</Link> : 'Pide a un admin que lo cree.'}
        </p>
      ) : (
        <PlanView
          imageUrl={wh.plan_image_path ? urls[wh.plan_image_path] ?? null : null}
          layout={wh.plan_source === 'sketch' ? parseStoredLayout(wh.layout) ?? DEFAULT_LAYOUT : null}
          aspectRatio={Number(wh.aspect_ratio)}
          zones={(zones ?? []).map((z) => ({ ...z, x: Number(z.x), y: Number(z.y), w: Number(z.w), h: Number(z.h) }))}
          items={mergeAvailability(items ?? [], avail ?? [])}
          isAdmin={isAdmin}
          groupId={groupId}
          warehouseId={whId}
        />
      )}
    </main>
  );
}
