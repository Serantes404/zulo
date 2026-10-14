import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { joinGroup } from './actions';

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default function JoinPage(props: Props) {
  return (
    <main className="mx-auto max-w-sm space-y-6 p-4 pt-16">
      <h1 className="text-2xl font-semibold">Te han invitado a un grupo</h1>
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
      <p role="alert" className="text-red-700">
        Este link no es válido o ha caducado. Pide uno nuevo a un admin del grupo.
      </p>
    );
  }
  return (
    <form action={joinGroup.bind(null, code)}>
      <Button type="submit" className="w-full">Unirme al grupo</Button>
    </form>
  );
}
