import { Suspense } from 'react';
import { WarehouseSkeleton } from '@/components/skeletons';
import { notFound } from 'next/navigation';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { DEFAULT_LAYOUT, parseStoredLayout } from '@/lib/layout';
import { PlanEditorClient } from './PlanEditorClient';

export const maxDuration = 60;

type Params = Promise<{ groupId: string; whId: string }>;

export default function EditPlanPage({ params }: { params: Params }) {
  return (
    // Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>.
    <Suspense fallback={<WarehouseSkeleton />}>
      <EditPlan params={params} />
    </Suspense>
  );
}

async function EditPlan({ params }: { params: Params }) {
  const { groupId, whId } = await params;
  const { supabase, user } = await requireUser();
  if ((await getRole(supabase, groupId, user.id)) !== 'admin') notFound();

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
  const urls = await signedUrls(supabase, wh.plan_image_path ? [wh.plan_image_path] : []);

  return (
    <PlanEditorClient
      groupId={groupId}
      warehouseId={whId}
      name={wh.name}
      imageUrl={wh.plan_image_path ? urls[wh.plan_image_path] ?? null : null}
      aspectRatio={Number(wh.aspect_ratio)}
      planSource={wh.plan_source === 'sketch' || wh.plan_source === 'photo' ? wh.plan_source : null}
      initialLayout={wh.plan_source === 'sketch' ? parseStoredLayout(wh.layout) ?? DEFAULT_LAYOUT : null}
      initialZones={(zones ?? []).map((z) => ({
        id: z.id,
        key: z.id,
        label: z.label,
        color: z.color,
        x: Number(z.x),
        y: Number(z.y),
        w: Number(z.w),
        h: Number(z.h),
      }))}
    />
  );
}
