'use client';
import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LoanCard } from '@/lib/myLoans';
import { loadReturnedAction } from './actions';
import { ActiveLoanCard, ReturnedLoanCard } from './LoanCardItem';

type Props = { groupId: string; active: LoanCard[]; returned: LoanCard[]; returnedHasMore: boolean };

export function LoansTabs({ groupId, active, returned, returnedHasMore }: Props) {
  const [rows, setRows] = useState(returned);
  const [hasMore, setHasMore] = useState(returnedHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more() {
    setLoading(true);
    setError(null);
    const r = await loadReturnedAction(groupId, rows.length);
    setLoading(false);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setRows((prev) => [...prev, ...r.cards.filter((n) => !prev.some((p) => p.id === n.id))]);
    setHasMore(r.hasMore);
  }

  return (
    <Tabs defaultValue="activos">
      <TabsList aria-label="Estado de los préstamos">
        <TabsTrigger value="activos">Activos ({active.length})</TabsTrigger>
        <TabsTrigger value="devueltos">Devueltos</TabsTrigger>
      </TabsList>
      <TabsContent value="activos">
        {active.length > 0 ? (
          <ul className="space-y-3">
            {active.map((c) => <ActiveLoanCard key={c.id} card={c} />)}
          </ul>
        ) : (
          <EmptyState icon={HandCoins} title="No tienes nada prestado" />
        )}
      </TabsContent>
      <TabsContent value="devueltos" className="space-y-3">
        {rows.length > 0 ? (
          <>
            <ul className="space-y-2">
              {rows.map((c) => <ReturnedLoanCard key={c.id} card={c} />)}
            </ul>
            <FormError id="returned-error">{error}</FormError>
            {hasMore && (
              <Button variant="ghost" size="lg" className="w-full" disabled={loading} onClick={more}>
                {loading ? 'Cargando…' : 'Ver más'}
              </Button>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Todavía no has devuelto nada.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
