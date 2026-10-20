'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { HandCoins, Search, Users, Warehouse, type LucideIcon } from 'lucide-react';
import { cn } from 'cn';
import { isTabActive, tabHref, type TabKey } from '@/lib/nav';

/** Definición única de las pestañas, compartida con la cabecera de escritorio. */
export const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'almacenes', label: 'Almacenes', icon: Warehouse },
  { key: 'buscar', label: 'Buscar', icon: Search },
  { key: 'prestamos', label: 'Préstamos', icon: HandCoins },
  { key: 'grupo', label: 'Grupo', icon: Users },
];

export function BottomNav() {
  const { groupId } = useParams<{ groupId?: string }>();
  const pathname = usePathname();
  if (!groupId) return null;
  return (
    <nav
      aria-label="Navegación del grupo"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = isTabActive(key, groupId, pathname);
          return (
            <li key={key} className="flex-1">
              <Link
                href={tabHref(key, groupId, pathname)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-full min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none transition-colors duration-(--dur-fast) ease-(--ease-zulo) focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-signal" />}
                <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
