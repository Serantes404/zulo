import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { GroupSkeleton } from '@/components/skeletons';
import { requireUser, getRole, type Role } from '@/lib/auth';
import { canRemoveMember, countLoansByUser } from '@/lib/members';
import { initials } from '@/lib/nav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { regenerateInvite } from '../actions';
import { InviteLink } from '../InviteLink';
import { MemberMenu } from '../MemberMenu';

type Params = Promise<{ groupId: string }>;

const overline = 'text-xs font-medium uppercase tracking-wider text-muted-foreground';

export const metadata: Metadata = { title: 'Grupo' };

export default function GroupMembersPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-lg space-y-6 p-4">
      {/* Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={<GroupSkeleton />}>
        <GroupMembersContent params={params} />
      </Suspense>
    </main>
  );
}

async function GroupMembersContent({ params }: { params: Params }) {
  const { groupId } = await params;
  const { supabase, user } = await requireUser();
  const role = await getRole(supabase, groupId, user.id);
  if (!role) notFound();
  const isAdmin = role === 'admin';

  const [{ data: group }, { data: members }, { data: activeLoans }] = await Promise.all([
    supabase.from('groups').select('id, name, invite_code').eq('id', groupId).single(),
    supabase.from('group_members').select('user_id, role, profiles(full_name)').eq('group_id', groupId).order('created_at'),
    // Una sola consulta para todos los miembros (sin N+1); solo la necesita el admin para el aviso de echar.
    isAdmin
      ? supabase
          .from('loans')
          .select('user_id, items!inner(zones!inner(warehouses!inner(group_id)))')
          .eq('status', 'active')
          .eq('items.zones.warehouses.group_id', groupId)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);
  const loansByUser = countLoansByUser(activeLoans);
  if (!group) notFound();

  return (
    <>
      <header>
        <p className={overline}>Grupo</p>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
      </header>

      <section aria-labelledby="miembros-title" className="space-y-3">
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
                  <MemberMenu
                    groupId={groupId}
                    userId={m.user_id}
                    name={name}
                    canRemove={canRemoveMember({ id: user.id, role }, { id: m.user_id, role: m.role as Role })}
                    activeLoans={loansByUser[m.user_id] ?? 0}
                  />
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
    </>
  );
}
