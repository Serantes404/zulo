'use client';
import { X } from 'lucide-react';
import { ItemList } from '@/components/ItemList';
import { SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ZoneChip } from '@/components/ZoneChip';
import type { ItemWithPhoto } from '@/lib/itemPhotos';

type Props = {
  zone: { id: string; label: string; color: string };
  items: ItemWithPhoto[];
  isAdmin: boolean;
  groupId: string;
  warehouseId: string;
  highlightId?: string | null;
  /** Dentro del Sheet el título es el SheetTitle; en el panel de escritorio, un h2 con botón de cerrar. */
  inSheet?: boolean;
  onClose?: () => void;
};

export function ZonePanel({ zone, items, isAdmin, groupId, warehouseId, highlightId, inSheet, onClose }: Props) {
  const out = items.filter((i) => i.out > 0).length;
  const summary = `${items.length === 1 ? '1 material' : `${items.length} materiales`}${out ? ` · ${out === 1 ? '1 prestado' : `${out} prestados`}` : ''}`;
  const chip = <ZoneChip label={zone.label} color={zone.color} className="text-sm uppercase tracking-wide" />;
  return (
    <section aria-label={inSheet ? undefined : `Zona ${zone.label}`} className="space-y-3">
      <div className={`flex items-start justify-between gap-2${inSheet ? ' pr-12' : ''}`}>
        <div className="min-w-0 space-y-1">
          {inSheet ? (
            <SheetTitle render={<h2 />} className="flex">{chip}</SheetTitle>
          ) : (
            <h2 className="flex">{chip}</h2>
          )}
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        {!inSheet && onClose && (
          <Button variant="ghost" size="icon-lg" onClick={onClose}>
            <X aria-hidden="true" />
            <span className="sr-only">Cerrar zona</span>
          </Button>
        )}
      </div>
      <ItemList zone={zone} items={items} isAdmin={isAdmin} groupId={groupId} warehouseId={warehouseId} highlightId={highlightId} />
    </section>
  );
}
