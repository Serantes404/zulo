'use client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ChevronRight, SearchX, Search, X } from 'lucide-react';
import { availabilityLabel, searchItems, zoneStatus } from '@/lib/availability';
import type { ItemWithPhoto } from '@/lib/itemPhotos';
import { zoneMark } from '@/lib/zoneStyle';
import { FloorPlan } from '@/components/FloorPlan';
import type { Layout } from '@/lib/layout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ZoneChip } from '@/components/ZoneChip';
import { ZonePanel } from '@/components/ZonePanel';
import { ZoneOverlay } from '@/components/ZoneOverlay';

type ZoneRow = { id: string; label: string; color: string; x: number; y: number; w: number; h: number };
type Props = {
  imageUrl: string | null;
  aspectRatio: number;
  layout: Layout | null;
  zones: ZoneRow[];
  items: ItemWithPhoto[];
  isAdmin: boolean;
  groupId: string;
  warehouseId: string;
  /** Miniatura: solo el plano, sin foco, sin handlers y oculto a lectores de pantalla. */
  static?: boolean;
};

const GRID =
  'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)';

const LG = '(min-width: 1024px)';
function subscribeLg(cb: () => void) {
  const mq = window.matchMedia(LG);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useIsDesktop() {
  return useSyncExternalStore(subscribeLg, () => window.matchMedia(LG).matches, () => false);
}

export function PlanView({ imageUrl, aspectRatio, layout, zones, items, isAdmin, groupId, warehouseId, static: isStatic = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  // El tab "Buscar" de la barra inferior enlaza a #buscar: enfocar el campo (el scroll lo hace el navegador / Next).
  useEffect(() => {
    if (isStatic) return;
    const focusIfHash = () => {
      if (window.location.hash === '#buscar') inputRef.current?.focus({ preventScroll: true });
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href$="#buscar"]');
      if (a) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };
    focusIfHash();
    window.addEventListener('hashchange', focusIfHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', focusIfHash);
      document.removeEventListener('click', onClick);
    };
  }, [isStatic]);

  const byZone = useMemo(() => {
    const m = new Map<string, ItemWithPhoto[]>();
    for (const i of items) m.set(i.zone_id, [...(m.get(i.zone_id) ?? []), i]);
    return m;
  }, [items]);
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const hits = new Set(results.map((r) => r.zone_id));
  const searching = query.trim().length > 0;
  const zoneById = (id: string) => zones.find((z) => z.id === id);
  const selectedZone = zones.find((z) => z.id === selected);

  function pickZone(id: string, itemId: string | null = null) {
    setSelected(id);
    setHighlight(itemId);
  }
  function closeZone() {
    setSelected(null);
    setHighlight(null);
  }

  const plan = (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-lg border lg:w-[min(100%,calc((100dvh-9rem)*var(--ar)))]"
      style={{
        '--ar': String(aspectRatio),
        aspectRatio: String(aspectRatio),
        backgroundImage: layout ? undefined : imageUrl ? `url("${imageUrl}")` : GRID,
        backgroundSize: layout ? undefined : imageUrl ? '100% 100%' : '24px 24px',
      } as CSSProperties}
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
            onClick={isStatic ? undefined : () => pickZone(z.id)}
          />
        );
      })}
    </div>
  );

  if (isStatic) return <div aria-hidden="true">{plan}</div>;

  return (
    <div>
      {/* Buscador fijo bajo la cabecera de 56 px. Su bloque contenedor es este div (alto = todo el contenido); ningún ancestro tiene overflow. */}
      <div className="sticky top-14 z-30 -mx-4 bg-background/90 px-4 py-2 backdrop-blur lg:mx-0 lg:px-0">
        <Label htmlFor="buscar" className="sr-only">Buscar material</Label>
        <div className="relative lg:ml-auto lg:w-[380px]">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="buscar"
            type="search"
            placeholder="Buscar material…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="scroll-mt-20 bg-background pr-12 pl-10 shadow-md [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="absolute top-0 right-0"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
              <span className="sr-only">Borrar búsqueda</span>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-6">
      <div className="space-y-3 lg:col-start-2 lg:row-start-1">
        <div aria-live="polite" className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
          {searching && (results.length === 1 ? '1 resultado' : `${results.length} resultados`)}
        </div>
        {searching &&
          (results.length === 0 ? (
            <EmptyState icon={SearchX} title={`No hay nada llamado «${query.trim()}»`} description="Prueba con otra palabra o toca una zona." />
          ) : (
            <ul className="divide-y rounded-lg border">
              {results.map((r) => {
                const z = zoneById(r.zone_id);
                const mark = zoneMark(r.overdue ? 'overdue' : r.out > 0 ? 'out' : 'ok');
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pickZone(r.zone_id, r.id)}
                      className="flex min-h-14 w-full items-center gap-3 p-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          {z && <ZoneChip label={z.label} color={z.color} />}
                          {availabilityLabel(r)}
                          {mark && <span>· {mark.text}</span>}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>

      <div className="space-y-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {plan}
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Leyenda: reloj = prestado · triángulo = vencido
        </p>
        <p className="text-sm text-muted-foreground lg:hidden">Toca una zona para ver su material.</p>
      </div>

      {/* Escritorio: panel fijo a la derecha. */}
      {isDesktop && (
        <div className="lg:col-start-2 lg:row-start-2">
          {selectedZone ? (
            <ZonePanel
              zone={selectedZone}
              items={byZone.get(selectedZone.id) ?? []}
              isAdmin={isAdmin}
              groupId={groupId}
              warehouseId={warehouseId}
              highlightId={highlight}
              onClose={closeZone}
            />
          ) : (
            !searching && (
              <section aria-labelledby="zone-list-title" className="space-y-2">
                <h2 id="zone-list-title" className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">Zonas</h2>
                <ul className="divide-y rounded-lg border">
                  {zones.map((z) => {
                    const n = byZone.get(z.id)?.length ?? 0;
                    return (
                      <li key={z.id}>
                        <button
                          type="button"
                          onClick={() => pickZone(z.id)}
                          className="flex min-h-12 w-full items-center gap-3 p-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          <ZoneChip label={z.label} color={z.color} />
                          <span className="ml-auto text-sm text-muted-foreground">{n === 1 ? '1 material' : `${n} materiales`}</span>
                          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )
          )}
        </div>
      )}

      </div>

      {/* Móvil: sheet modal desde abajo (~60 % de la pantalla). */}
      <Sheet open={!isDesktop && !!selectedZone} onOpenChange={(o) => !o && closeZone()}>
        <SheetContent className="data-[side=bottom]:max-h-[60dvh]">
          <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          {selectedZone && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <ZonePanel
                inSheet
                zone={selectedZone}
                items={byZone.get(selectedZone.id) ?? []}
                isAdmin={isAdmin}
                groupId={groupId}
                warehouseId={warehouseId}
                highlightId={highlight}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
