'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Package, Search, SearchX } from 'lucide-react';
import { availabilityLabel, searchItems } from '@/lib/availability';
import { groupByInitial, materialHref, type MaterialRow } from '@/lib/materialList';
import { zoneMark } from '@/lib/zoneStyle';
import { EmptyState } from '@/components/EmptyState';
import { ZoneChip } from '@/components/ZoneChip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const sectionId = (letter: string) => `letra-${letter === '#' ? 'otros' : letter}`;

/** Todo el material del grupo de la A a la Z; cada fila lleva al plano con su zona abierta. */
export function MaterialList({ groupId, rows }: { groupId: string; rows: MaterialRow[] }) {
  const [query, setQuery] = useState('');
  const filtered = query.trim() ? searchItems(rows, query) : rows;
  const sections = groupByInitial(filtered);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Aún no hay material"
        description="Abre un almacén, toca una zona y añade lo que hay en ella."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="filtrar-material" className="sr-only">Buscar material</Label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filtrar-material"
            type="search"
            placeholder="Buscar material…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <p aria-live="polite" className="mt-2 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
          {filtered.length === 1 ? '1 material' : `${filtered.length} materiales`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title={`No hay nada llamado «${query.trim()}»`} description="Prueba con otra palabra." />
      ) : (
        sections.map(({ letter, rows: list }) => (
          <section key={letter} aria-labelledby={sectionId(letter)} className="space-y-2">
            <h2 id={sectionId(letter)} className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              <span className="sr-only">Letra </span>
              {letter}
            </h2>
            <ul className="divide-y rounded-lg border bg-card">
              {list.map((r) => {
                const mark = zoneMark(r.overdue ? 'overdue' : r.out > 0 ? 'out' : 'ok');
                return (
                  <li key={r.id}>
                    <Link
                      href={materialHref(groupId, r)}
                      className="flex min-h-14 items-center gap-3 p-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <span className="truncate">{r.warehouse.name}</span>
                          <ZoneChip label={r.zone.label} color={r.zone.color} />
                          <span>
                            {availabilityLabel(r)}
                            {mark && ` · ${mark.text}`}
                          </span>
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
