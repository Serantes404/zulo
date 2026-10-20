import { Suspense } from 'react';
import { DetailSkeleton } from '@/components/skeletons';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { signedUrls } from '@/lib/signed';
import { conditionLabel } from '@/lib/loans';

type Params = Promise<{ loanId: string }>;

const fmt = (d: string) =>
  new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });

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

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {loan.items && <Link href={`/item/${loan.items.id}`} className="text-sm underline">← {loan.items.name}</Link>}
      <h1 className="text-2xl font-semibold">Préstamo de {loan.items?.name}</h1>
      <p>{loan.profiles?.full_name ?? 'Alguien'} · {loan.quantity} ud. · {loan.purpose}</p>
      {loan.status === 'returned' && loan.returned_at ? (
        <p>Devuelto el {fmt(loan.returned_at)} · Estado: <strong>{conditionLabel(loan.return_condition)}</strong></p>
      ) : (
        <p>Aún no devuelto · hasta {loan.due_date}</p>
      )}
      {loan.return_notes && <p className="whitespace-pre-line">Notas: {loan.return_notes}</p>}

      <div className="grid grid-cols-2 gap-3">
        <figure className="space-y-1">
          <figcaption className="text-sm font-medium">Antes · {fmt(loan.checked_out_at)}</figcaption>
          {before && <img src={before} alt={`Material al cogerlo: ${loan.items?.name ?? ''}`} className="w-full rounded-lg border" />}
        </figure>
        <figure className="space-y-1">
          <figcaption className="text-sm font-medium">Después</figcaption>
          {after ? (
            <img src={after} alt={`Material al devolverlo: ${loan.items?.name ?? ''}`} className="w-full rounded-lg border" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border text-sm text-muted-foreground">Pendiente</div>
          )}
        </figure>
      </div>
    </main>
  );
}
