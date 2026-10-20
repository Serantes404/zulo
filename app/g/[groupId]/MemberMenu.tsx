'use client';
import { useTransition } from 'react';
import { MoreHorizontal, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toaster';
import { makeAdmin } from './actions';

/** Menú ⋯ de un miembro no admin (solo lo ve un admin). */
export function MemberMenu({ groupId, userId, name }: { groupId: string; userId: string; name: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await makeAdmin(groupId, userId);
      if ('error' in r) toast({ title: 'No se ha podido', description: r.error, variant: 'error' });
      else toast({ title: 'Ahora es admin', description: name });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label={`Opciones de ${name}`} disabled={pending} />}>
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onClick}>
          <ShieldCheck aria-hidden="true" /> Hacer admin
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
