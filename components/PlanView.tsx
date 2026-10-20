'use client';
import { useMemo, useState } from 'react';
import { availabilityLabel, searchItems, zoneStatus, type ItemWithAvail } from '@/lib/availability';
import { ItemList } from '@/components/ItemList';
import { FloorPlan } from '@/components/FloorPlan';
import type { Layout } from '@/lib/layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ZoneOverlay } from '@/components/ZoneOverlay';

type ZoneRow = { id: string; label: string; color: string; x: number; y: number; w: number; h: number };
type Props = {
  imageUrl: string | null;
  aspectRatio: number;
  layout: Layout | null;
  zones: ZoneRow[];
  items: ItemWithAvail[];
  isAdmin: boolean;
  groupId: string;
  warehouseId: string;
  /** Miniatura: solo el plano, sin foco, sin handlers y oculto a lectores de pantalla. */
  static?: boolean;
};

const GRID =
  'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)';

export function PlanView({ imageUrl, aspectRatio, layout, zones, items, isAdmin, groupId, warehouseId, static: isStatic = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const byZone = useMemo(() => {
    const m = new Map<string, ItemWithAvail[]>();
    for (const i of items) m.set(i.zone_id, [...(m.get(i.zone_id) ?? []), i]);
    return m;
  }, [items]);
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const hits = new Set(results.map((r) => r.zone_id));
  const searching = query.trim().length > 0;
  const zoneLabel = (id: string) => zones.find((z) => z.id === id)?.label ?? '';
  const selectedZone = zones.find((z) => z.id === selected);

  return (
    <div className="space-y-4" aria-hidden={isStatic || undefined}>
      {!isStatic && (
      <div>
        <Label htmlFor="q" className="sr-only">Buscar material</Label>
        <Input id="q" type="search" placeholder="Buscar material (p. ej. linternas)" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      )}

      {!isStatic && searching && (
        <div aria-live="polite" className="text-sm">
          {results.length === 0 ? (
            <p>No hay material con ese nombre.</p>
          ) : (
            <ul className="space-y-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" className="underline" onClick={() => setSelected(r.zone_id)}>{r.name}</button>{' '}
                  en «{zoneLabel(r.zone_id)}» · {availabilityLabel(r)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{
          aspectRatio: String(aspectRatio),
          backgroundImage: layout ? undefined : imageUrl ? `url("${imageUrl}")` : GRID,
          backgroundSize: layout ? undefined : imageUrl ? '100% 100%' : '24px 24px',
        }}
      >
        {layout && (
          <FloorPlan aspectRatio={aspectRatio} layout={layout} className="pointer-events-none absolute inset-0 h-full w-full" />
        )}
        {zones.map((z) => {
          const st = zoneStatus(byZone.get(z.id) ?? []);
          return (
            <ZoneOverlay
              key={z.id}
              label={z.label}
              color={z.color}
              geometry={z}
              status={st}
              selected={!isStatic && selected === z.id}
              hit={searching && hits.has(z.id)}
              dim={searching && !hits.has(z.id)}
              aria-pressed={isStatic ? undefined : selected === z.id}
              onClick={isStatic ? undefined : () => setSelected(z.id)}
            />
          );
        })}
      </div>

      {!isStatic && (
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Leyenda: reloj = prestado · triángulo = vencido
        </p>
      )}

      {isStatic ? null : selectedZone ? (
        <ItemList
          zone={selectedZone}
          items={byZone.get(selectedZone.id) ?? []}
          isAdmin={isAdmin}
          groupId={groupId}
          warehouseId={warehouseId}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Toca una zona del plano para ver su material.</p>
      )}
    </div>
  );
}
