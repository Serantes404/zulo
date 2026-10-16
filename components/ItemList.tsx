'use client';
import Link from 'next/link';
import { availabilityLabel, type ItemWithAvail } from '@/lib/availability';
import { createItem } from '@/app/g/[groupId]/w/[whId]/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  zone: { id: string; label: string };
  items: ItemWithAvail[];
  isAdmin: boolean;
  groupId: string;
  warehouseId: string;
};

export function ItemList({ zone, items, isAdmin, groupId, warehouseId }: Props) {
  return (
    <section aria-labelledby="zone-title" className="space-y-3 rounded-lg border p-4">
      <h2 id="zone-title" className="text-lg font-semibold">{zone.label}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay material en esta zona.</p>
      ) : (
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/item/${i.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-muted">
                <span>{i.name}</span>
                <span className="text-sm">
                  {availabilityLabel(i)}
                  {i.overdue && <Badge className="ml-2 bg-red-700 text-white">Vencido</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <form action={createItem.bind(null, groupId, warehouseId, zone.id)} className="grid gap-2 border-t pt-3">
          <p className="text-sm font-medium">Añadir material a {zone.label}</p>
          <Label htmlFor="item-name">Nombre</Label>
          <Input id="item-name" name="name" required maxLength={80} placeholder="Linternas" />
          <Label htmlFor="item-qty">Cantidad</Label>
          <Input id="item-qty" name="quantity" type="number" min={1} defaultValue={1} required />
          <Label htmlFor="item-notes">Notas (opcional)</Label>
          <Textarea id="item-notes" name="notes" maxLength={500} />
          <Button type="submit">Añadir</Button>
        </form>
      )}
    </section>
  );
}
