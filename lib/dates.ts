export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function defaultDueDate(today: Date = new Date(), days = 7): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isOverdue(dueDate: string, today: Date = new Date()): boolean {
  return dueDate < toISODate(today);
}
