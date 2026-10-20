export type AvailabilityByZone = { zone_id: string | null; quantity_out: number | null };

/** Resumen de la tarjeta de almacén. "Prestados" = materiales con unidades fuera. Sin zonas = sin plano. */
export function summarizeWarehouse(zones: { id: string }[], avail: AvailabilityByZone[]) {
  const zoneCount = zones.length;
  if (zoneCount === 0) return { zoneCount, outCount: 0, subtitle: 'Sin plano' };
  const ids = new Set(zones.map((z) => z.id));
  const outCount = avail.filter((a) => a.zone_id && ids.has(a.zone_id) && (a.quantity_out ?? 0) > 0).length;
  const zonas = zoneCount === 1 ? '1 zona' : `${zoneCount} zonas`;
  const prestados = outCount === 1 ? '1 prestado' : `${outCount} prestados`;
  return { zoneCount, outCount, subtitle: `${zonas} · ${prestados}` };
}
