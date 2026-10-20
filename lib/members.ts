import type { Role } from '@/lib/auth';

type Person = { id: string; role: Role };

/** Solo un admin puede echar, solo a miembros (no admins) y nunca a sí mismo. */
export function canRemoveMember(viewer: Person, target: Person): boolean {
  return viewer.role === 'admin' && target.role === 'member' && viewer.id !== target.id;
}

/** Préstamos activos por usuario, a partir de las filas de una sola consulta. */
export function countLoansByUser(rows: { user_id: string }[] | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows ?? []) out[r.user_id] = (out[r.user_id] ?? 0) + 1;
  return out;
}
