'use server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { attachCardPhotos, fetchReturnedLoans, type LoanCard } from '@/lib/myLoans';

const pageSchema = z.object({ groupId: z.string().uuid(), offset: z.number().int().min(0).max(100000) });

/** Siguiente página de devueltos. El tamaño de página lo fija el servidor; solo se usa el cliente RLS. */
export async function loadReturnedAction(
  groupId: string,
  offset: number,
): Promise<{ cards: LoanCard[]; hasMore: boolean } | { error: string }> {
  const p = pageSchema.safeParse({ groupId, offset });
  if (!p.success) return { error: 'No se han podido cargar los préstamos devueltos.' };
  const { supabase, user } = await requireUser();
  const r = await fetchReturnedLoans(supabase, p.data.groupId, user.id, p.data.offset);
  if ('error' in r) return r;
  return { ...r, cards: await attachCardPhotos(supabase, r.cards) };
}
