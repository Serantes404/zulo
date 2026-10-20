'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from 'cn';
import { isTabActive, tabHref } from '@/lib/nav';
import { TABS } from '@/components/nav-tabs';

/** Pestañas de escritorio (≥ md) dentro de la cabecera; solo bajo /g/[groupId]. */
export function HeaderTabs() {
  const { groupId } = useParams<{ groupId?: string }>();
  const pathname = usePathname();
  if (!groupId) return null;
  return (
    <nav aria-label="Navegación del grupo" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = isTabActive(key, groupId, pathname);
          return (
            <li key={key}>
              <Link
                href={tabHref(key, groupId, pathname)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition-colors duration-(--dur-fast) ease-(--ease-zulo) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active ? 'text-foreground shadow-[inset_0_-2px_0_var(--signal)]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
