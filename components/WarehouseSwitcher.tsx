'use client';
import Link from 'next/link';
import { ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SwitcherWarehouse = { id: string; name: string };

const titleClass = 'min-w-0 truncate text-xl font-semibold';

export function WarehouseSwitcher({ groupId, current, warehouses }: { groupId: string; current: SwitcherWarehouse; warehouses: SwitcherWarehouse[] }) {
  if (warehouses.length < 2) return <h1 className={titleClass}>{current.name}</h1>;
  return (
    <h1 className="min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-11 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-xl font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-10">
          <span className="truncate">{current.name}</span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">: cambiar de almacén</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Cambiar de almacén</DropdownMenuLabel>
            {warehouses.map((w) => (
              <DropdownMenuItem key={w.id} render={<Link href={`/g/${groupId}/w/${w.id}`} aria-current={w.id === current.id ? 'page' : undefined} />}>
                <span className="truncate">{w.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </h1>
  );
}
