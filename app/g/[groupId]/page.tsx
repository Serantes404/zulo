import { Suspense } from 'react';
import { GroupSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Map as MapIcon, Warehouse } from 'lucide-react';
import { requireUser, getRole } from '@/lib/auth';
import { isOverdue } from '@/lib/dates';
import { initials } from '@/lib/nav';
import { summarizeWarehouse } from '@/lib/warehouseSummary';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { regenerateInvite } from './actions';
import { InviteLink } from './InviteLink';
import { MemberMenu } from './MemberMenu';
import { NewWarehouseDialog } from './NewWarehouseDialog';
import { WarehouseMenu } from './WarehouseMenu';

type Params = Promise<{ groupId: string }>;

const overline = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

function formatDue(due: string): string {
  return new Date(`${due}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

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

  const [{ data: group }, { data: warehouses }, { data: members }] = await Promise.all([
    supabase.from('groups').select('id, name, invite_code').eq('id', groupId).single(),
    supabase.from('warehouses').select('id, name, zones(id)').eq('group_id', groupId).order('created_at'),
    supabase.from('group_members').select('user_id, role, profiles(full_name)').eq('group_id', groupId).order('created_at'),
  ]);
  if (!group) notFound();

  // "Prestados": una sola consulta a item_availability para todas las zonas del grupo (sin N+1).
  const zoneIds = (warehouses ?? []).flatMap((w) => w.zones.map((z) => z.id));
  const [{ data: avail }, { data: myLoans }] = await Promise.all([
    zoneIds.length > 0
      ? supabase.from('item_availability').select('zone_id, quantity_out').in('zone_id', zoneIds)
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
            <Link href={`/g/${groupId}/prestamos`} className="text-sm text-primary underline-offset-4 hover:underline">Ver todo</Link>
          </div>
          {myLoans && myLoans.length > 0 ? (
            <ul className="divide-y rounded-xl border bg-card">
              {myLoans.map((l) => (
                <li key={l.id}>
                  <Link href={`/item/${l.items.id}`} className="flex min-h-11 items-center justify-between gap-2 p-3 hover:bg-muted/50">
                    <span className="min-w-0 truncate">{l.items.name} ×{l.quantity}</span>
                    {isOverdue(l.due_date) ? (
                      <Badge variant="danger">Vencido · {formatDue(l.due_date)}</Badge>
                    ) : (
                      <span className="shrink-0 text-sm text-muted-foreground">Vence {formatDue(l.due_date)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes material prestado.</p>
          )}
        </section>

        <section id="miembros" aria-labelledby="miembros-title" className="scroll-mt-16 space-y-3">
          <h2 id="miembros-title" className={overline}>Miembros ({members?.length ?? 0})</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {(members ?? []).map((m) => {
              const name = m.profiles?.full_name || 'Sin nombre';
              return (
                <li key={m.user_id} className="flex min-h-14 items-center gap-3 px-3 py-1">
                  <Avatar>
                    <AvatarFallback>{initials(m.profiles?.full_name, null)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <Badge variant={m.role === 'admin' ? 'default' : 'outline'}>{m.role === 'admin' ? 'Admin' : 'Miembro'}</Badge>
                  {isAdmin && m.role === 'member' ? (
                    <MemberMenu groupId={groupId} userId={m.user_id} name={name} />
                  ) : isAdmin ? (
                    <span className="size-11 shrink-0 md:size-10" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {isAdmin && (
          <section aria-labelledby="invitar-title" className="space-y-3 rounded-xl border bg-card p-4">
            <h2 id="invitar-title" className="font-semibold">Invitar monitores</h2>
            <p className="text-sm text-muted-foreground">Comparte este link. Quien entre será miembro del grupo.</p>
            <InviteLink code={group.invite_code} groupName={group.name} onRegenerate={regenerateInvite.bind(null, groupId)} />
          </section>
        )}
      </div>
    </div>
  );
}
