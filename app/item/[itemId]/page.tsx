import { Suspense } from 'react';
import { DetailSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Check, Clock, PackageOpen } from 'lucide-react';
import { requireUser, getRole } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { isOverdue } from '@/lib/dates';
import { fetchHistory } from '@/lib/itemHistory';
import { formatShortDate, madridShortDate, outSummary, soonestDue } from '@/lib/loanSummary';
import { initials } from '@/lib/nav';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ZoneChip } from '@/components/ZoneChip';
import { HistoryList } from './HistoryList';
import { ItemAdminForm } from './ItemAdminForm';
import { ReturnButton } from './ReturnButton';
import { TakeBar } from './TakeBar';

type Params = Promise<{ itemId: string }>;

export default function ItemPage({ params }: { params: Params }) {
  return (
    // Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>.
    <Suspense fallback={<DetailSkeleton />}>
      <Item params={params} />
    </Suspense>
  );
}

const sectionTitle = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

async function Item({ params }: { params: Params }) {
  const { itemId } = await params;
  const { supabase, user } = await requireUser();

  const { data: item } = await supabase
    .from('items')
    .select('id, name, quantity_total, notes, photo_path, zones(id, label, color, warehouses(id, name, group_id))')
    .eq('id', itemId)
    .maybeSingle();
  const zone = item?.zones;
  const wh = zone?.warehouses;
  if (!item || !zone || !wh) notFound();

  const groupId = wh.group_id;
  const role = await getRole(supabase, groupId, user.id);
  if (!role) notFound();
  const isAdmin = role === 'admin';

  const [{ data: avail }, { data: active }, history] = await Promise.all([
    supabase.from('item_availability').select('quantity_available').eq('item_id', itemId).maybeSingle(),
    supabase
      .from('loans')
      .select('id, quantity, purpose, due_date, user_id, checked_out_at, checkout_photo_path, profiles(full_name)')
      .eq('item_id', itemId)
      .eq('status', 'active')
      .order('due_date'),
    fetchHistory(supabase, itemId, 0),
  ]);
  const loans = active ?? [];
  const available = avail?.quantity_available ?? item.quantity_total;
  const unitsOut = loans.reduce((n, l) => n + l.quantity, 0);
  const due = soonestDue(loans);

  const canReturn = (l: { user_id: string }) => l.user_id === user.id || isAdmin;
  const photoPaths = [
    ...(item.photo_path ? [item.photo_path] : []),
    ...loans.filter(canReturn).map((l) => l.checkout_photo_path),
  ];
  const urls = await signedUrls(supabase, photoPaths);
  const photoUrl = item.photo_path ? urls[item.photo_path] ?? null : null;
  const backTo = `/g/${groupId}/w/${wh.id}`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-32">
      <Link href={backTo} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold tracking-wide uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring">
        <ChevronLeft aria-hidden="true" className="size-5" />
        {zone.label}
      </Link>

      <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={`Foto de ${item.name}`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <PackageOpen aria-hidden="true" className="size-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{item.name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ZoneChip label={zone.label} color={zone.color} />
              <span>{wh.name}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-lg font-semibold">
                <Check aria-hidden="true" className="size-5 text-success-ink" />
                {available} de {item.quantity_total}
              </p>
              <p className={sectionTitle}>Disponibles</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-lg leading-tight font-semibold">
                <Clock aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                {outSummary(unitsOut, due)}
              </p>
              <p className={sectionTitle}>Prestadas</p>
            </div>
          </div>
          {item.notes && <p className="text-sm whitespace-pre-line"><span className="font-medium">Notas:</span> {item.notes}</p>}
        </div>
      </div>

      <section className="space-y-2" aria-labelledby="active-title">
        <h2 id="active-title" className={sectionTitle}>Préstamos activos</h2>
        {loans.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {loans.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 p-2">
                <Avatar><AvatarFallback>{initials(l.profiles?.full_name, null)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate">
                    <span className="font-medium">{l.profiles?.full_name ?? 'Alguien'}</span> ×{l.quantity}
                  </p>
                  <p className="truncate text-muted-foreground">{l.purpose} · {formatShortDate(l.due_date)}</p>
                </div>
                {isOverdue(l.due_date) && (
                  <Badge variant="danger"><Clock aria-hidden="true" />Vencido</Badge>
                )}
                {canReturn(l) && (
                  <ReturnButton
                    loanId={l.id}
                    groupId={groupId}
                    itemName={item.name}
                    beforeUrl={urls[l.checkout_photo_path] ?? null}
                    beforeDate={madridShortDate(l.checked_out_at)}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nadie tiene este material ahora mismo.</p>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="history-title">
        <h2 id="history-title" className={sectionTitle}>Historial</h2>
        {'error' in history ? (
          <p role="alert" className="text-sm text-destructive">{history.error}</p>
        ) : (
          <HistoryList itemId={item.id} initialRows={history.rows} initialHasMore={history.hasMore} />
        )}
      </section>

      {isAdmin && (
        <ItemAdminForm
          item={{ id: item.id, name: item.name, quantity_total: item.quantity_total, notes: item.notes }}
          groupId={groupId}
          backTo={backTo}
        />
      )}

      <TakeBar itemId={item.id} itemName={item.name} groupId={groupId} available={available} />
    </main>
  );
}
