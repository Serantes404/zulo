'use client';
import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deleteItem, setItemPhoto, updateItem } from './actions';

type Props = {
  item: { id: string; name: string; quantity_total: number; notes: string | null };
  groupId: string;
  backTo: string;
};

export function ItemAdminForm({ item, groupId, backTo }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateItem.bind(null, item.id), null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm(`¿Borrar «${item.name}»? No se puede deshacer.`)) return;
    const r = await deleteItem(item.id, backTo);
    if (r && 'error' in r) setError(r.error);
  }

  async function onPhoto(path: string) {
    const r = await setItemPhoto(item.id, path);
    if ('error' in r) setError(r.error);
    else router.refresh();
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Editar material</h2>
      <form action={formAction} className="grid gap-2">
        <Label htmlFor="edit-name">Nombre</Label>
        <Input id="edit-name" name="name" defaultValue={item.name} required maxLength={80} />
        <Label htmlFor="edit-qty">Cantidad total</Label>
        <Input id="edit-qty" name="quantity" type="number" min={1} defaultValue={item.quantity_total} required />
        <Label htmlFor="edit-notes">Notas</Label>
        <Textarea id="edit-notes" name="notes" defaultValue={item.notes ?? ''} maxLength={500} />
        {state && 'error' in state && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state && 'ok' in state && <p role="status" className="text-sm text-green-700">Guardado.</p>}
        <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </form>
      <PhotoCapture groupId={groupId} kind="items" label="Añadir o cambiar foto" onUploaded={onPhoto} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="button" variant="destructive" onClick={onDelete}>Borrar material</Button>
    </section>
  );
}
