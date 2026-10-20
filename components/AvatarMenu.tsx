'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AvatarMenu({
  name,
  initials,
  signOutAction,
}: {
  name: string;
  initials: string;
  signOutAction: () => void | Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="flex size-11 items-center justify-center rounded-full md:size-10"
      >
        <Avatar>
          <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate text-sm text-foreground">{name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/welcome" />}>Cambiar nombre</DropdownMenuItem>
        <form action={signOutAction}>
          <DropdownMenuItem render={<button type="submit" className="w-full text-left" />}>Salir</DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
