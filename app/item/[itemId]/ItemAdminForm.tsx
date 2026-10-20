'use client';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from '@/components/PhotoCapture';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toaster';
import { deleteItem, setItemPhoto, updateItem } from './actions';

type Props = {
  item: { id: string; name: string; quantity_total: number; notes: string | null };
  groupId: string;
  backTo: string;
};

export function ItemAdminForm({ item, groupId, backTo }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateItem.bind(null, item.id), null);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state && 'ok' in state) toast({ title: 'Cambios guardados' });
  }, [state, toast]);

  function onDelete() {
    startDelete(async () => {
      const r = await deleteItem(item.id, backTo);
      if (r && 'error' in r) {
        setDeleteOpen(false);
        setError(r.error);
      }
    });
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
        <FormError id="edit-error">{state && 'error' in state ? state.error : null}</FormError>
        <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </form>
      <PhotoCapture groupId={groupId} kind="items" label="Añadir o cambiar foto" onUploaded={onPhoto} />
      <FormError id="item-admin-error">{error}</FormError>
      <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>Borrar material</Button>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar «{item.name}»?</AlertDialogTitle>
            <AlertDialogDescription>El material desaparecerá de su zona. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={onDelete}>Borrar material</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
