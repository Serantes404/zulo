import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ListSkeleton } from '@/components/skeletons';
import { requireUser, getRole } from '@/lib/auth';
import { attachCardPhotos, fetchActiveLoans, fetchReturnedLoans } from '@/lib/myLoans';
import { LoansTabs } from './LoansTabs';

type Params = Promise<{ groupId: string }>;

export default function LoansPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Mis préstamos</h1>
      {/* Con Cache Components, params y la sesión solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={<ListSkeleton />}>
        <LoansContent params={params} />
      </Suspense>
    </main>
  );
}

async function LoansContent({ params }: { params: Params }) {
  const { groupId } = await params;
  const { supabase, user } = await requireUser();
  const role = await getRole(supabase, groupId, user.id);
  if (!role) notFound();

  const [active, returned] = await Promise.all([
    fetchActiveLoans(supabase, groupId, user.id),
    fetchReturnedLoans(supabase, groupId, user.id, 0),
  ]);
  if ('error' in active) return <p role="alert" className="text-sm text-destructive">{active.error}</p>;
  if ('error' in returned) return <p role="alert" className="text-sm text-destructive">{returned.error}</p>;

  // Una sola llamada de firmado para las fotos de ambas pestañas.
  const all = await attachCardPhotos(supabase, [...active, ...returned.cards]);
  return (
    <LoansTabs
      groupId={groupId}
      active={all.slice(0, active.length)}
      returned={all.slice(active.length)}
      returnedHasMore={returned.hasMore}
    />
  );
}
