import { Suspense } from 'react';
import { ListSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { ChevronRight, Plus, UsersRound } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { initials } from '@/lib/nav';
import { EmptyState } from '@/components/EmptyState';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createGroup } from './actions';

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

function CreateGroupForm({ hasGroups }: { hasGroups: boolean }) {
  return (
    <section id="crear" aria-labelledby="crear-title" className="scroll-mt-20 space-y-3">
      {hasGroups && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
        </div>
      )}
      <form action={createGroup} className="space-y-2">
        <Label htmlFor="name" id="crear-title">Crear un grupo nuevo</Label>
        <div className="flex gap-2">
          <Input id="name" name="name" required maxLength={80} placeholder="Scouts Seeonee" className="h-11" />
          <Button type="submit" size="lg" className="h-11 px-5">Crear</Button>
        </div>
      </form>
    </section>
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
            <Link href="#crear" className={buttonVariants({ size: 'lg' })}>
              Crear grupo
            </Link>
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
          <Link
            href="#crear"
            className="flex min-h-[72px] flex-1 items-center justify-center gap-2 rounded-lg border border-dashed p-3 font-medium text-muted-foreground transition-colors hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="size-5" aria-hidden="true" />
            Crear grupo
          </Link>
        </li>
      </ul>
      <CreateGroupForm hasGroups />
    </>
  );
}
