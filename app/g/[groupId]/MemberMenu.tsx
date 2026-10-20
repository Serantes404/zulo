'use client';
import { useState, useTransition } from 'react';
import { MoreHorizontal, ShieldCheck, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toaster';
import { makeAdmin, removeMember } from './actions';

type Props = { groupId: string; userId: string; name: string; activeLoans?: number; canRemove?: boolean };

/** Menú ⋯ de un miembro no admin (solo lo ve un admin): Hacer admin y Echar del grupo. */
export function MemberMenu({ groupId, userId, name, activeLoans = 0, canRemove = false }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);

  function onClick() {
    startTransition(async () => {
      const r = await makeAdmin(groupId, userId);
      if ('error' in r) toast({ title: 'No se ha podido', description: r.error, variant: 'error' });
      else toast({ title: 'Ahora es admin', description: name });
    });
  }

  function onRemove() {
    startTransition(async () => {
      const r = await removeMember(groupId, userId);
      if ('error' in r) toast({ title: 'No se ha podido echar', description: r.error, variant: 'error' });
      else {
        toast({ title: `${name} ya no está en el grupo` });
        if (r.inviteWarning) toast({ title: 'Revisa el link de invitación', description: 'Crea un link nuevo para que no pueda volver a entrar.', variant: 'error' });
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`Opciones de ${name}`} disabled={pending} />}>
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onClick}>
            <ShieldCheck aria-hidden="true" /> Hacer admin
          </DropdownMenuItem>
          {canRemove && (
            <DropdownMenuItem variant="destructive" onClick={() => setRemoveOpen(true)}>
              <UserMinus aria-hidden="true" /> Echar del grupo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canRemove && (
        <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Echar a {name} del grupo?</AlertDialogTitle>
              <AlertDialogDescription>
                Perderá el acceso al grupo y a sus almacenes. Se creará un link de invitación nuevo para que no pueda volver a entrar con el anterior.
                {activeLoans > 0 &&
                  ` Tiene ${activeLoans} ${activeLoans === 1 ? 'préstamo activo' : 'préstamos activos'}; seguirán registrados y un admin puede devolverlos desde la ficha del material.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onRemove}>Echar del grupo</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
