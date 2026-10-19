import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { availabilityLabel } from '@/lib/availability';
import { isOverdue } from '@/lib/dates';
import { conditionLabel } from '@/lib/loans';
import { Badge } from '@/components/ui/badge';
import { CheckoutForm } from './CheckoutForm';
import { ItemAdminForm } from './ItemAdminForm';
import { ReturnForm } from './ReturnForm';

type Params = Promise<{ itemId: string }>;

export default function ItemPage({ params }: { params: Params }) {
  return (
    // Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>.
    <Suspense fallback={<p className="p-4 text-muted-foreground">Cargando…</p>}>
      <Item params={params} />
    </Suspense>
  );
}

async function Item({ params }: { params: Params }) {
  const { itemId } = await params;
  const { supabase, user } = await requireUser();

  const { data: item } = await supabase
    .from('items')
    .select('id, name, quantity_total, notes, photo_path, zones(id, label, warehouses(id, name, group_id))')
    .eq('id', itemId)
    .maybeSingle();
  const zone = item?.zones;
  const wh = zone?.warehouses;
  if (!item || !zone || !wh) notFound();

  const groupId = wh.group_id;
  const role = await getRole(supabase, groupId, user.id);
  if (!role) notFound();
  const isAdmin = role === 'admin';

  const [{ data: avail }, { data: active }, { data: history }] = await Promise.all([
    supabase.from('item_availability').select('quantity_available').eq('item_id', itemId).maybeSingle(),
    supabase
      .from('loans')
      .select('id, quantity, purpose, due_date, user_id, profiles(full_name)')
      .eq('item_id', itemId)
      .eq('status', 'active')
      .order('due_date'),
    supabase
      .from('loans')
      .select('id, quantity, returned_at, return_condition, profiles(full_name)')
      .eq('item_id', itemId)
      .eq('status', 'returned')
      .order('returned_at', { ascending: false })
      .limit(10),
  ]);
  const available = avail?.quantity_available ?? item.quantity_total;
  const urls = await signedUrls(supabase, item.photo_path ? [item.photo_path] : []);
  const photoUrl = item.photo_path ? urls[item.photo_path] ?? null : null;
  const backTo = `/g/${groupId}/w/${wh.id}`;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4">
      <Link href={backTo} className="text-sm underline">← {wh.name} · {zone.label}</Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <p>{availabilityLabel({ available, quantity_total: item.quantity_total })}</p>
        {item.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{item.notes}</p>}
      </div>
      {photoUrl && <img src={photoUrl} alt={`Foto de ${item.name}`} className="max-h-64 rounded-lg border" />}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Coger material</h2>
        {available > 0 ? (
          <CheckoutForm itemId={item.id} groupId={groupId} available={available} />
        ) : (
          <p className="text-muted-foreground">No quedan unidades disponibles.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Prestado ahora</h2>
        {active && active.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {active.map((l) => (
              <li key={l.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.profiles?.full_name ?? 'Alguien'}</span>
                  <span className="text-sm">· {l.quantity} ud. · {l.purpose} · hasta {l.due_date}</span>
                  {isOverdue(l.due_date) && <Badge className="bg-red-700 text-white">Vencido</Badge>}
                </div>
                {(l.user_id === user.id || isAdmin) && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium underline">Devolver</summary>
                    <ReturnForm loanId={l.id} groupId={groupId} />
                  </details>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Nadie tiene este material ahora mismo.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Últimas devoluciones</h2>
        {history && history.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {history.map((l) => (
              <li key={l.id}>
                <Link href={`/loan/${l.id}`} className="block p-3 text-sm hover:bg-muted">
                  {l.profiles?.full_name ?? 'Alguien'} · {l.quantity} ud. · {conditionLabel(l.return_condition)} ·{' '}
                  {l.returned_at ? new Date(l.returned_at).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }) : ''}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Todavía no hay devoluciones.</p>
        )}
      </section>

      {isAdmin && (
        <ItemAdminForm
          item={{ id: item.id, name: item.name, quantity_total: item.quantity_total, notes: item.notes }}
          groupId={groupId}
          backTo={backTo}
        />
      )}
    </main>
  );
}
