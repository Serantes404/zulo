import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions';
import { initials } from '@/lib/nav';
import { Logo } from '@/components/Logo';
import { GroupSwitcher } from '@/components/GroupSwitcher';
import { HeaderTabs } from '@/components/HeaderTabs';
import { AvatarMenu } from '@/components/AvatarMenu';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('group_members').select('groups(id, name)').eq('user_id', user.id).order('created_at'),
  ]);
  const groups = (memberships ?? []).flatMap((m) => (m.groups ? [{ id: m.groups.id, name: m.groups.name }] : []));
  const fullName = profile?.full_name?.trim() || null;

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-5xl items-center gap-2 px-3">
        <Logo />
        <GroupSwitcher groups={groups} />
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={null}>
            <HeaderTabs />
          </Suspense>
          <AvatarMenu
            name={fullName ?? user.email ?? 'Sin nombre'}
            initials={initials(fullName, user.email)}
            signOutAction={signOut}
          />
        </div>
      </div>
    </header>
  );
}
