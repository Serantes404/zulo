import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ListSkeleton } from '@/components/skeletons';
import { requireUser, getRole } from '@/lib/auth';
import { buildMaterialRows } from '@/lib/materialList';
import { MaterialList } from './MaterialList';

type Params = Promise<{ groupId: string }>;

export const metadata: Metadata = { title: 'Material' };

export default function MaterialPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 md:max-w-3xl">
      <h1 className="text-2xl font-semibold">Material</h1>
      {/* Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={<ListSkeleton />}>
        <MaterialContent params={params} />
      </Suspense>
    </main>
  );
}

async function MaterialContent({ params }: { params: Params }) {
  const { groupId } = await params;
  const { supabase, user } = await requireUser();
  if (!(await getRole(supabase, groupId, user.id))) notFound();

  // Almacenes (máx. 20) → zonas → material y disponibilidad, filtrando siempre por ids del grupo.
  const { data: warehouses } = await supabase.from('warehouses').select('id, name').eq('group_id', groupId);
  const whIds = (warehouses ?? []).map((w) => w.id);
  const { data: zones } = whIds.length
    ? await supabase.from('zones').select('id, label, color, warehouse_id').in('warehouse_id', whIds)
    : { data: [] };
  const zoneIds = (zones ?? []).map((z) => z.id);
  const [{ data: items }, { data: avail }] = zoneIds.length
    ? await Promise.all([
        supabase.from('items').select('id, name, zone_id, quantity_total, notes, photo_path').in('zone_id', zoneIds),
        supabase.from('item_availability').select('item_id, quantity_out, quantity_available, has_overdue').in('zone_id', zoneIds),
      ])
    : [{ data: [] }, { data: [] }];

  const rows = buildMaterialRows(items ?? [], zones ?? [], warehouses ?? [], avail ?? []);
  return <MaterialList groupId={groupId} rows={rows} />;
}
