import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { ChevronRight, Plus, UsersRound } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { initials } from '@/lib/nav';
import { EmptyState } from '@/components/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreateGroupForm } from '../CreateGroupForm';
import { CreateGroupLink } from '../CreateGroupLink';

// Colores de la paleta de zonas (decorativos), elegidos por hash del id del grupo.
const AVATAR_TINTS = [
  'bg-chart-1/20',
  'bg-chart-2/20',
  'bg-chart-3/20',
  'bg-chart-4/20',
  'bg-chart-5/20',
];

function tintFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

export const metadata: Metadata = { title: 'Mis grupos' };

export default function Home() {
  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 md:max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Mis grupos</h1>
      {/* Con Cache Components, la sesión solo se lee dentro de un <Suspense>. */}
      <Suspense fallback={<ListSkeleton />}>
        <MyGroups />
      </Suspense>
    </main>
  );
}

async function MyGroups() {
  const { supabase, user } = await requireUser();
  const { data: memberships } = await supabase
    .from('group_members')
    .select('role, groups(id, name)')
    .eq('user_id', user.id)
    .order('created_at');

  if (!memberships || memberships.length === 0) {
    return (
      <>
        <EmptyState
          icon={UsersRound}
          title="Aún no estás en ningún grupo"
          description="Crea el de tu club o pide el link a tu monitor."
          action={
            <CreateGroupLink className={buttonVariants({ size: 'lg' })}>
              Crear grupo
            </CreateGroupLink>
          }
        />
        <CreateGroupForm hasGroups={false} />
      </>
    );
  }
  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {memberships.map((m) =>
          m.groups ? (
            <li key={m.groups.id}>
              <Link
                data-testid="core-item"
                href={`/g/${m.groups.id}`}
                className="flex min-h-[72px] items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Avatar className="size-12">
                  <AvatarFallback aria-hidden="true" className={`${tintFor(m.groups.id)} text-foreground`}>
                    {initials(m.groups.name, null)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.groups.name}</span>
                  <span className="block font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {m.role === 'admin' ? 'Admin' : 'Miembro'}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ) : null,
        )}
        <li className="hidden md:flex">
          <CreateGroupLink className="flex min-h-[72px] flex-1 items-center justify-center gap-2 rounded-lg border border-dashed p-3 font-medium text-muted-foreground transition-colors hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Plus className="size-5" aria-hidden="true" />
            Crear grupo
          </CreateGroupLink>
        </li>
      </ul>
      <CreateGroupForm hasGroups />
    </>
  );
}
