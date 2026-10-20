'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from 'cn';
import { hidesBottomNav, isTabActive, tabHref } from '@/lib/nav';
import { TABS } from '@/components/nav-tabs';

export function BottomNav() {
  const { groupId } = useParams<{ groupId?: string }>();
  const pathname = usePathname();
  if (!groupId || hidesBottomNav(groupId, pathname)) return null;
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
                  'relative flex h-full min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors duration-(--dur-fast) ease-(--ease-zulo)',
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
