'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SwitcherGroup = { id: string; name: string };

const triggerClass =
  'outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex h-11 min-w-0 max-w-[12rem] items-center gap-1.5 rounded-md px-2 text-sm font-medium md:h-10 md:max-w-[16rem] hover:bg-muted';

export function GroupSwitcher({ groups }: { groups: SwitcherGroup[] }) {
  const { groupId } = useParams<{ groupId?: string }>();
  const current = groups.find((g) => g.id === groupId);

  if (groups.length === 0) return null;

  // Un solo grupo y estamos dentro de él: nombre sin chevron.
  if (current && groups.length === 1) {
    return (
      <Link href={`/g/${current.id}`} className={`${triggerClass} truncate`}>
        <span className="truncate">{current.name}</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass}>
        <span className="truncate">{current ? current.name : 'Mis grupos'}</span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cambiar de grupo</DropdownMenuLabel>
          {groups.map((g) => (
            <DropdownMenuItem key={g.id} render={<Link href={`/g/${g.id}`} />}>
              <span className="truncate">{g.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* La creación de grupos vive en la portada (formulario "Crear un grupo nuevo"). */}
        <DropdownMenuItem render={<Link href="/#crear" />}>Crear grupo</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
