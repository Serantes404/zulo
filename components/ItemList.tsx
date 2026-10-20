'use client';
import Link from 'next/link';
import { ChevronRight, ImageOff, PackageOpen } from 'lucide-react';
import { availabilityLabel } from '@/lib/availability';
import type { ItemWithPhoto } from '@/lib/itemPhotos';
import { AddItemDialog } from '@/components/AddItemDialog';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { cn } from 'cn';

type Props = {
  zone: { id: string; label: string };
  items: ItemWithPhoto[];
  isAdmin: boolean;
  groupId: string;
  warehouseId: string;
  /** Material a resaltar (viene de tocar un resultado de búsqueda). */
  highlightId?: string | null;
};

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {url ? (
        // Nombre del material en texto adyacente: la imagen es decorativa.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <ImageOff aria-hidden="true" className="size-6 text-muted-foreground" />
      )}
    </div>
  );
}

export function ItemList({ zone, items, isAdmin, groupId, warehouseId, highlightId }: Props) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No hay material en esta zona"
          description={isAdmin ? 'Añade el primer material de esta zona.' : undefined}
          action={isAdmin ? <AddItemDialog zone={zone} groupId={groupId} warehouseId={warehouseId} /> : undefined}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/item/${i.id}`}
                data-highlight={highlightId === i.id ? 'true' : undefined}
                className={cn(
                  'flex min-h-[76px] items-center gap-3 p-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring',
                  highlightId === i.id && 'bg-muted ring-2 ring-signal ring-inset',
                )}
              >
                <Thumb url={i.photoUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    {availabilityLabel(i)}
                    {i.overdue && <Badge variant="danger">Vencido</Badge>}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {isAdmin && items.length > 0 && <AddItemDialog zone={zone} groupId={groupId} warehouseId={warehouseId} />}
    </div>
  );
}
