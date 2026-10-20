'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, TriangleAlert } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/FormError';
import { initials } from '@/lib/nav';
import { conditionLabel } from '@/lib/loans';
import { loadHistoryAction, type HistoryRow } from './actions';

export function HistoryList({ itemId, initialRows, initialHasMore }: { itemId: string; initialRows: HistoryRow[]; initialHasMore: boolean }) {
  const [rows, setRows] = useState(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more() {
    setLoading(true);
    setError(null);
    const r = await loadHistoryAction(itemId, rows.length);
    setLoading(false);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setRows((prev) => [...prev, ...r.rows.filter((n) => !prev.some((p) => p.id === n.id))]);
    setHasMore(r.hasMore);
  }

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay devoluciones.</p>;
  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-lg border">
        {rows.map((l) => {
          const fine = l.returnCondition === 'ok';
          return (
            <li key={l.id}>
              <Link href={`/loan/${l.id}`} className="flex min-h-14 items-center gap-3 p-2 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring">
                <Avatar><AvatarFallback>{initials(l.name, null)}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{l.name ?? 'Alguien'}</span> ×{l.quantity}
                  {l.returnedDate && <span className="text-muted-foreground"> · {l.returnedDate}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  {fine ? <Check aria-hidden="true" className="size-4" /> : <TriangleAlert aria-hidden="true" className="size-4" />}
                  devuelto · {conditionLabel(l.returnCondition).toLowerCase()}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <FormError id="history-error">{error}</FormError>
      {hasMore && (
        <Button variant="ghost" className="w-full" disabled={loading} onClick={more}>
          {loading ? 'Cargando…' : 'Ver más'}
        </Button>
      )}
    </div>
  );
}
