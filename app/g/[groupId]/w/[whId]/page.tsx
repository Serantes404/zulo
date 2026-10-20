import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WarehouseSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { mergeAvailability } from '@/lib/availability';
import { attachPhotoUrls, photoPaths } from '@/lib/itemPhotos';
import { EmptyState } from '@/components/EmptyState';
import { WarehouseSwitcher } from '@/components/WarehouseSwitcher';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Map as MapIcon, Pencil } from 'lucide-react';
import { PlanView } from '@/components/PlanView';
import { DEFAULT_LAYOUT, parseStoredLayout } from '@/lib/layout';

type Params = Promise<{ groupId: string; whId: string }>;

export const metadata: Metadata = { title: 'Almacén' };

export default function WarehousePage({ params }: { params: Params }) {
  return (
    // Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>.
    <Suspense fallback={<WarehouseSkeleton />}>
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

  const [{ data: items }, { data: avail }, { data: warehouses }] = await Promise.all([
    supabase.from('items').select('id, name, zone_id, quantity_total, notes, photo_path').in('zone_id', zoneIds).order('name'),
    supabase.from('item_availability').select('item_id, quantity_out, quantity_available, has_overdue').in('zone_id', zoneIds),
    supabase.from('warehouses').select('id, name').eq('group_id', groupId).order('created_at'),
  ]);
  // Una sola llamada firma el plano y todas las fotos del almacén (Storage RLS ya limita al grupo).
  const urls = await signedUrls(supabase, [...(wh.plan_image_path ? [wh.plan_image_path] : []), ...photoPaths(items ?? [])]);
  const planItems = attachPhotoUrls(mergeAvailability(items ?? [], avail ?? []), urls);
  const editHref = `/g/${groupId}/w/${whId}/edit`;

  return (
    <main className="mx-auto max-w-3xl space-y-2 px-4 pb-6 lg:max-w-5xl">
      <div className="flex items-center gap-1 pt-2">
        <Link
          href={`/g/${groupId}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:size-10"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
          <span className="sr-only">Volver al grupo</span>
        </Link>
        <WarehouseSwitcher groupId={groupId} current={{ id: wh.id, name: wh.name }} warehouses={warehouses ?? []} />
        {isAdmin && zoneIds.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto" nativeButton={false} render={<Link href={editHref} />}>
            <Pencil aria-hidden="true" /> Editar
          </Button>
        )}
      </div>
      {zoneIds.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="Este almacén aún no tiene plano"
          description={isAdmin ? 'Dibuja el plano y marca las zonas para empezar a guardar material.' : 'Pide a un admin que cree el plano.'}
          action={isAdmin ? <Button nativeButton={false} render={<Link href={editHref} />}>Dibujar el plano</Button> : undefined}
        />
      ) : (
        <PlanView
          imageUrl={wh.plan_image_path ? urls[wh.plan_image_path] ?? null : null}
          layout={wh.plan_source === 'sketch' ? parseStoredLayout(wh.layout) ?? DEFAULT_LAYOUT : null}
          aspectRatio={Number(wh.aspect_ratio)}
          zones={(zones ?? []).map((z) => ({ ...z, x: Number(z.x), y: Number(z.y), w: Number(z.w), h: Number(z.h) }))}
          items={planItems}
          isAdmin={isAdmin}
          groupId={groupId}
          warehouseId={whId}
        />
      )}
    </main>
  );
}
