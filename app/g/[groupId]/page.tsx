import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createWarehouse, makeAdmin, regenerateInvite } from './actions';
import { InviteLink } from './InviteLink';

type Params = Promise<{ groupId: string }>;

export default function GroupPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-lg space-y-8 p-4">
      {/* Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
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
    supabase.from('warehouses').select('id, name').eq('group_id', groupId).order('created_at'),
    supabase.from('group_members').select('user_id, role, profiles(full_name)').eq('group_id', groupId).order('created_at'),
  ]);
  if (!group) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold">{group.name}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Almacenes</h2>
        {warehouses && warehouses.length > 0 ? (
          <ul className="space-y-2">
            {warehouses.map((w) => (
              <li key={w.id}>
                <Link href={`/g/${groupId}/w/${w.id}`} className="block rounded-lg border p-4 hover:bg-muted">{w.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Todavía no hay almacenes.</p>
        )}
        {isAdmin && (
          <form action={createWarehouse.bind(null, groupId)} className="space-y-2">
            <Label htmlFor="wh-name">Nuevo almacén</Label>
            <div className="flex gap-2">
              <Input id="wh-name" name="name" required maxLength={80} placeholder="Zulo del local" />
              <Button type="submit">Crear</Button>
            </div>
          </form>
        )}
      </section>

      {/* MIS_PRESTAMOS: en la Tarea 12 se inserta aquí la sección "Mis préstamos" */}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Miembros</h2>
        <ul className="divide-y rounded-lg border">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between p-3">
              <span>
                {m.profiles?.full_name ?? 'Sin nombre'}{' '}
                <span className="text-sm text-muted-foreground">· {m.role === 'admin' ? 'Admin' : 'Miembro'}</span>
              </span>
              {isAdmin && m.role === 'member' && (
                <form action={makeAdmin.bind(null, groupId, m.user_id)}>
                  <Button size="sm" variant="outline" type="submit">Hacer admin</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Invitar monitores</h2>
          <p className="text-sm text-muted-foreground">Comparte este link. Quien entre será miembro del grupo.</p>
          <InviteLink code={group.invite_code} onRegenerate={regenerateInvite.bind(null, groupId)} />
        </section>
      )}
    </>
  );
}
