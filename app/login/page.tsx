import { Suspense } from 'react';
import { safeNext } from '@/lib/safeNext';
import { LoginForm } from './LoginForm';

type SearchParams = Promise<{ next?: string; error?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-sm space-y-6 p-4 pt-16">
      <h1 className="text-2xl font-semibold">Entrar en Zulo</h1>
      <p className="text-muted-foreground">Te enviamos un enlace al email; no hace falta contraseña.</p>
      {/* Con Cache Components, searchParams solo se puede leer dentro de un <Suspense>. */}
      <Suspense fallback={null}>
        <LoginFormFromParams searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginFormFromParams({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;
  return <LoginForm next={safeNext(next)} linkError={error === 'link'} />;
}
