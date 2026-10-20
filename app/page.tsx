import { Suspense } from 'react';
import { ListSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGroup } from './actions';

export default function Home() {
  return (
    <main className="mx-auto max-w-lg space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Mis grupos</h1>
      {/* Con Cache Components, la sesión solo se lee dentro de un <Suspense>. */}
      <Suspense fallback={<ListSkeleton />}>
        <MyGroups />
      </Suspense>
      <form action={createGroup} className="space-y-2">
        <Label htmlFor="name">Crear un grupo nuevo</Label>
        <div className="flex gap-2">
          <Input id="name" name="name" required maxLength={80} placeholder="Scouts Seeonee" />
          <Button type="submit">Crear</Button>
        </div>
      </form>
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
      <p className="text-muted-foreground">
        Aún no estás en ningún grupo. Crea uno o pide a tu monitor el link de invitación.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {memberships.map((m) =>
        m.groups ? (
          <li key={m.groups.id}>
            <Link href={`/g/${m.groups.id}`} className="block rounded-lg border p-4 hover:bg-muted">
              {m.groups.name}{' '}
              <span className="text-sm text-muted-foreground">· {m.role === 'admin' ? 'Admin' : 'Miembro'}</span>
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}
