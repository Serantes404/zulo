import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Unlink, Users } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { Logo } from '@/components/Logo';
import { joinGroup } from './actions';

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = { title: 'Unirse al grupo' };

export default function JoinPage(props: Props) {
  return (
    <main className="mx-auto max-w-sm space-y-6 p-4 pt-8">
      <Logo />
      {/* Con Cache Components, params, searchParams y la sesión solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={null}>
        <JoinForm {...props} />
      </Suspense>
    </main>
  );
}

async function JoinForm({ params, searchParams }: Props) {
  const { code } = await params;
  const { error } = await searchParams;
  await requireUser();
  if (error) {
    return (
      <EmptyState
        as="h1"
        icon={Unlink}
        title="Link no válido"
        description={
          <span role="alert">
            Este link no es válido o ha caducado. Pide uno nuevo a un admin del grupo.
          </span>
        }
        action={
          <Link href="/" className={buttonVariants({ size: 'lg' })}>
            Ir a mis grupos
          </Link>
        }
      />
    );
  }
  return (
    <form action={joinGroup.bind(null, code)} className="space-y-6 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-muted">
        <Users className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Te han invitado a un grupo</h1>
        <p className="text-sm text-muted-foreground">Podrás ver el almacén y coger material.</p>
      </div>
      <Button type="submit" size="lg" className="w-full">Unirme al grupo</Button>
    </form>
  );
}
