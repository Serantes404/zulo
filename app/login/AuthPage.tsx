import { Suspense } from 'react';
import { safeNext } from '@/lib/safeNext';
import { Logo } from '@/components/Logo';
import { AuthForm, type AuthMode } from './AuthForm';
import { PlanArt } from './PlanArt';

type SearchParams = Promise<{ next?: string }>;

/** Página compartida de /login y /signup. */
export function AuthPage({ mode, searchParams }: { mode: AuthMode; searchParams: SearchParams }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl md:grid-cols-2 md:items-center md:gap-10 md:p-8">
      <section className="space-y-4 md:order-1">
        <PlanArt className="h-40 w-full object-cover md:h-auto md:rounded-xl md:border md:border-plan-line" />
        <div className="space-y-2 px-4 md:px-0">
          <Logo href="/" />
          <p className="text-2xl font-semibold tracking-tight">El material de tu club, en un plano.</p>
        </div>
      </section>
      <div className="w-full max-w-sm space-y-6 p-4 md:order-2 md:mx-auto md:p-0">
        <h1 className="text-xl font-semibold">{mode === 'signup' ? 'Crea tu cuenta' : <>Entra en <span translate="no">Zulo</span></>}</h1>
        {/* Con Cache Components, searchParams solo se puede leer dentro de un <Suspense>. */}
        <Suspense fallback={null}>
          <AuthFormFromParams mode={mode} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthFormFromParams({ mode, searchParams }: { mode: AuthMode; searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <AuthForm mode={mode} next={safeNext(next)} />;
}
