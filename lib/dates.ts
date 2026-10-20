// "Hoy" es siempre el día de Europe/Madrid, igual que en la vista item_availability de la BD.
const madridFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Fecha de hoy en Madrid como YYYY-MM-DD. */
export function todayInMadrid(now: Date = new Date()): string {
  return madridFormat.format(now);
}

export function defaultDueDate(today: Date = new Date(), days = 7): string {
  const [y, m, d] = todayInMadrid(today).split('-').map(Number);
  // Aritmética de calendario en UTC: no depende de la zona ni de cambios de hora.
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string, today: Date = new Date()): boolean {
  return dueDate < todayInMadrid(today);
}

/** true si `s` es YYYY-MM-DD y la fecha existe (rechaza 2026-02-31). */
export function isRealISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const MAX_LOAN_DAYS = 365;

/** Última fecha de devolución que se acepta: hoy en Madrid + MAX_LOAN_DAYS. */
export function maxDueDate(now: Date = new Date()): string {
  return defaultDueDate(now, MAX_LOAN_DAYS);
}
