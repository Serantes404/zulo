'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Pencil, Ruler, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/FormError';
import { useToast } from '@/components/ui/toaster';
import { deleteWarehouse, renameWarehouse } from './actions';

type Props = { groupId: string; warehouseId: string; name: string };

/** Menú ⋯ de una tarjeta de almacén (solo admin): Editar plano, Renombrar, Eliminar. */
export function WarehouseMenu({ groupId, warehouseId, name }: Props) {
  const toast = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setRenameError(null);
    startTransition(async () => {
      const r = await renameWarehouse(groupId, warehouseId, data);
      if ('error' in r) setRenameError(r.error);
      else {
        setRenameOpen(false);
        toast({ title: 'Almacén renombrado' });
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteWarehouse(groupId, warehouseId);
      if (r) toast({ title: 'No se ha podido eliminar', description: r.error, variant: 'error' });
      else toast({ title: 'Almacén eliminado' });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`Opciones de ${name}`} />}>
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/g/${groupId}/w/${warehouseId}/edit`} />}>
            <Ruler aria-hidden="true" /> Editar plano
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setRenameError(null); setRenameOpen(true); }}>
            <Pencil aria-hidden="true" /> Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden="true" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar almacén</DialogTitle>
          </DialogHeader>
          <form onSubmit={onRename} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`rename-${warehouseId}`}>Nombre del almacén</Label>
              <Input
                id={`rename-${warehouseId}`}
                name="name"
                required
                maxLength={80}
                defaultValue={name}
                autoComplete="off"
                aria-invalid={renameError ? true : undefined}
                aria-describedby={renameError ? `rename-error-${warehouseId}` : undefined}
              />
              <FormError id={`rename-error-${warehouseId}`}>{renameError}</FormError>
            </div>
            <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{name}»?</AlertDialogTitle>
            <AlertDialogDescription>Se borrarán también su plano y sus zonas. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Eliminar almacén</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
