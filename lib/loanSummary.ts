import { todayInMadrid } from './dates';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Fecha de devolución más próxima entre préstamos activos (YYYY-MM-DD se ordena como texto). */
export function soonestDue(loans: { due_date: string }[]): string | null {
  let min: string | null = null;
  for (const l of loans) if (min === null || l.due_date < min) min = l.due_date;
  return min;
}

/** '2026-10-21' -> '21 oct'. Sin zonas horarias: es una fecha de calendario. */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Texto de la ficha de unidades prestadas: "1 prestada · vence 21 oct". */
export function outSummary(unitsOut: number, due: string | null): string {
  if (unitsOut <= 0) return 'Ninguna prestada';
  const base = `${unitsOut} ${unitsOut === 1 ? 'prestada' : 'prestadas'}`;
  return due ? `${base} · vence ${formatShortDate(due)}` : base;
}

/** Marca de tiempo (ISO) -> '21 oct' según el día de Madrid. */
export function madridShortDate(timestamp: string): string {
  return formatShortDate(todayInMadrid(new Date(timestamp)));
}

/** Paginación pidiendo size + 1 filas: la fila extra solo indica que hay más. */
export function splitPage<T>(rows: T[], size: number): { rows: T[]; hasMore: boolean } {
  return { rows: rows.slice(0, size), hasMore: rows.length > size };
}
