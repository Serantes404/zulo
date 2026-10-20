import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GroupSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Map as MapIcon, Users, Warehouse } from 'lucide-react';
import { requireUser, getRole } from '@/lib/auth';
import { isOverdue } from '@/lib/dates';
import { formatShortDate } from '@/lib/loanSummary';
import { summarizeWarehouse } from '@/lib/warehouseSummary';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { NewWarehouseDialog } from './NewWarehouseDialog';
import { WarehouseMenu } from './WarehouseMenu';

type Params = Promise<{ groupId: string }>;

const overline = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

export const metadata: Metadata = { title: 'Almacenes' };

export default function GroupPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-lg p-4 md:max-w-5xl">
      {/* Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={<GroupSkeleton />}>
        <GroupContent params={params} />
      </Suspense>
    </main>
  );
}

async function GroupContent({ params }: { params: Params }) {
  const { groupId } = await params;
  const { supabase, user } = await requireUser();
  const role = await getRole(supabase, groupId, user.id);
  if (!role) notFound();
  const isAdmin = role === 'admin';

  const [{ data: group }, { data: warehouses }, { count: memberCount }] = await Promise.all([
    supabase.from('groups').select('id, name').eq('id', groupId).single(),
    supabase.from('warehouses').select('id, name, zones(id)').eq('group_id', groupId).order('created_at'),
    supabase.from('group_members').select('user_id', { count: 'exact', head: true }).eq('group_id', groupId),
  ]);
  if (!group) notFound();

  // "Prestados": una sola consulta a item_availability para todas las zonas del grupo (sin N+1).
  const zoneIds = (warehouses ?? []).flatMap((w) => w.zones.map((z) => z.id));
  const [{ data: avail }, { data: myLoans }] = await Promise.all([
    zoneIds.length > 0
      ? supabase.from('item_availability').select('zone_id, quantity_out').in('zone_id', zoneIds).gt('quantity_out', 0)
      : Promise.resolve({ data: [] as { zone_id: string | null; quantity_out: number | null }[] }),
    supabase
      .from('loans')
      .select('id, quantity, due_date, items!inner(id, name, zones!inner(warehouses!inner(group_id)))')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('items.zones.warehouses.group_id', groupId)
      .order('due_date'),
  ]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
      <h1 className="sr-only">{group.name}</h1>

      <section aria-labelledby="almacenes-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="almacenes-title" className={overline}>Almacenes</h2>
          {isAdmin && warehouses && warehouses.length > 0 && <NewWarehouseDialog groupId={groupId} />}
        </div>
        {warehouses && warehouses.length > 0 ? (
          <ul className="space-y-2">
            {warehouses.map((w) => {
              const { subtitle } = summarizeWarehouse(w.zones, avail ?? []);
              return (
                <li key={w.id} className="flex items-center gap-1 rounded-xl border bg-card p-2 pr-1 transition-colors hover:bg-muted/50">
                  <Link href={`/g/${groupId}/w/${w.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring">
                    {/* Miniatura: marcador neutro (PlanView es interactivo y se restyla en las tareas 11-12). */}
                    <span aria-hidden="true" className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border bg-plan-paper text-muted-foreground md:h-24 md:w-32">
                      <MapIcon className="size-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{w.name}</span>
                      <span className="block text-sm text-muted-foreground">{subtitle}</span>
                    </span>
                  </Link>
                  {isAdmin && <WarehouseMenu groupId={groupId} warehouseId={w.id} name={w.name} />}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={Warehouse}
            title="Todavía no hay almacenes"
            description={isAdmin ? undefined : 'Pide a un admin que lo cree.'}
            action={isAdmin ? <NewWarehouseDialog groupId={groupId} variant="default" /> : undefined}
          />
        )}
      </section>

      <div className="space-y-8">
        <section aria-labelledby="prestamos-title" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="prestamos-title" className={overline}>Mis préstamos</h2>
            <Link href={`/g/${groupId}/prestamos`} className="inline-flex min-h-11 items-center rounded-md text-sm text-primary underline-offset-4 hover:underline outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Ver todo</Link>
          </div>
          {myLoans && myLoans.length > 0 ? (
            <ul className="divide-y rounded-xl border bg-card">
              {myLoans.map((l) => (
                <li key={l.id}>
                  <Link href={`/item/${l.items.id}`} className="flex min-h-11 items-center justify-between gap-2 p-3 hover:bg-muted/50 outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                    <span className="min-w-0 truncate">{l.items.name} ×{l.quantity}</span>
                    {isOverdue(l.due_date) ? (
                      <Badge variant="danger">Vencido · {formatShortDate(l.due_date)}</Badge>
                    ) : (
                      <span className="shrink-0 text-sm text-muted-foreground">Vence {formatShortDate(l.due_date)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes material prestado.</p>
          )}
        </section>

        <Link
          href={`/g/${groupId}/grupo`}
          className="flex min-h-14 items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Users aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block font-medium">Miembros e invitación</span>
              <span className="block text-sm text-muted-foreground">{memberCount ?? 0} {memberCount === 1 ? 'miembro' : 'miembros'}</span>
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
