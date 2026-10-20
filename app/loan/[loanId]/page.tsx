import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DetailSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Clock } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { conditionLabel } from '@/lib/loans';
import { isOverdue } from '@/lib/dates';
import { formatShortDate, madridShortDate } from '@/lib/loanSummary';
import { Badge } from '@/components/ui/badge';

type Params = Promise<{ loanId: string }>;

const fmt = (d: string) =>
  new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });

export const metadata: Metadata = { title: 'Préstamo' };

export default function LoanPage({ params }: { params: Params }) {
  return (
    // Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>.
    <Suspense fallback={<DetailSkeleton />}>
      <Loan params={params} />
    </Suspense>
  );
}

async function Loan({ params }: { params: Params }) {
  const { loanId } = await params;
  const { supabase } = await requireUser();
  const { data: loan } = await supabase
    .from('loans')
    .select(
      'id, quantity, purpose, due_date, checked_out_at, status, returned_at, return_condition, return_notes, checkout_photo_path, return_photo_path, profiles(full_name), items(id, name)',
    )
    .eq('id', loanId)
    .maybeSingle();
  if (!loan) notFound();

  const paths = [loan.checkout_photo_path, loan.return_photo_path].filter((p): p is string => !!p);
  const urls = await signedUrls(supabase, paths);
  const before = urls[loan.checkout_photo_path];
  const after = loan.return_photo_path ? urls[loan.return_photo_path] : undefined;
  const returned = loan.status === 'returned' && !!loan.returned_at;
  const overdue = !returned && isOverdue(loan.due_date);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {loan.items && (
        <Link href={`/item/${loan.items.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring">
          <ChevronLeft aria-hidden="true" className="size-5" />
          {loan.items.name}
        </Link>
      )}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Préstamo de {loan.items?.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {returned ? (
            <Badge variant="success">Devuelto · {conditionLabel(loan.return_condition)}</Badge>
          ) : overdue ? (
            <Badge variant="danger"><Clock aria-hidden="true" />Vencido</Badge>
          ) : (
            <Badge variant="warning">Activo</Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {loan.profiles?.full_name ?? 'Alguien'} · ×{loan.quantity} · {loan.purpose}
          </span>
        </div>
        <p className="text-sm">
          {returned && loan.returned_at
            ? `Devuelto el ${fmt(loan.returned_at)}`
            : `Aún no devuelto · vence ${formatShortDate(loan.due_date)}`}
        </p>
      </div>
      {loan.return_notes && <p className="text-sm whitespace-pre-line"><span className="font-medium">Notas:</span> {loan.return_notes}</p>}

      <div className="grid grid-cols-2 gap-3">
        <figure className="space-y-1">
          <figcaption className="text-sm font-medium">Antes · {madridShortDate(loan.checked_out_at)}</figcaption>
          {before && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before} alt={`Material al cogerlo: ${loan.items?.name ?? ''}`} className="aspect-[4/3] w-full rounded-lg border object-cover" />
          )}
        </figure>
        <figure className="space-y-1">
          <figcaption className="text-sm font-medium">Después{returned && loan.returned_at ? ` · ${madridShortDate(loan.returned_at)}` : ''}</figcaption>
          {after ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={after} alt={`Material al devolverlo: ${loan.items?.name ?? ''}`} className="aspect-[4/3] w-full rounded-lg border object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Pendiente</div>
          )}
        </figure>
      </div>
    </main>
  );
}
