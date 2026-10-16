'use client';
import { useMemo, useState } from 'react';
import { availabilityLabel, searchItems, zoneStatus, type ItemWithAvail, type ZoneStatus } from '@/lib/availability';
import { ItemList } from '@/components/ItemList';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ZoneRow = { id: string; label: string; color: string; x: number; y: number; w: number; h: number };
type Props = {
  imageUrl: string | null;
  aspectRatio: number;
  zones: ZoneRow[];
  items: ItemWithAvail[];
  isAdmin: boolean;
  groupId: string;
  warehouseId: string;
};

const STATUS_TEXT: Record<ZoneStatus, string | null> = { overdue: 'Vencido', out: 'Prestado', ok: null };
const GRID =
  'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)';

export function PlanView({ imageUrl, aspectRatio, zones, items, isAdmin, groupId, warehouseId }: Props) {
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
    <div className="space-y-4">
      <div>
        <Label htmlFor="q" className="sr-only">Buscar material</Label>
        <Input id="q" type="search" placeholder="Buscar material (p. ej. linternas)" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {searching && (
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
          backgroundImage: imageUrl ? `url("${imageUrl}")` : GRID,
          backgroundSize: imageUrl ? '100% 100%' : '24px 24px',
        }}
      >
        {zones.map((z) => {
          const st = zoneStatus(byZone.get(z.id) ?? []);
          const isHit = searching && hits.has(z.id);
          const dim = searching && !hits.has(z.id);
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelected(z.id)}
              aria-pressed={selected === z.id}
              aria-label={`${z.label}${STATUS_TEXT[st] ? `, ${STATUS_TEXT[st]}` : ''}`}
              className="absolute rounded-sm transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              style={{
                left: `${z.x * 100}%`,
                top: `${z.y * 100}%`,
                width: `${z.w * 100}%`,
                height: `${z.h * 100}%`,
                border: `2px solid ${z.color}`,
                background: `${z.color}${selected === z.id ? '66' : '33'}`,
                opacity: dim ? 0.25 : 1,
                boxShadow: isHit ? `0 0 0 4px ${z.color}` : undefined,
              }}
            >
              <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium text-gray-900">{z.label}</span>
              {STATUS_TEXT[st] && (
                <span
                  className={`absolute bottom-1 right-1 rounded px-1.5 text-xs font-medium ${
                    st === 'overdue' ? 'bg-red-700 text-white' : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {STATUS_TEXT[st]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedZone ? (
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
