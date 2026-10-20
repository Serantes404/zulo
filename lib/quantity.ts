/** Convierte el texto de un campo de cantidad en un entero entre 1 y max (vacío o inválido -> 1). */
export function clampQuantity(raw: string | number, max: number): number {
  const n = typeof raw === 'number' ? Math.trunc(raw) : parseInt(raw, 10);
  const safeMax = Math.max(1, Math.trunc(max));
  return Math.min(safeMax, Math.max(1, Number.isFinite(n) ? n : 1));
}
