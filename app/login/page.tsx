import { Suspense } from 'react';
import { safeNext } from '@/lib/safeNext';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';
import { PlanArt } from './PlanArt';

type SearchParams = Promise<{ next?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl md:grid-cols-2 md:items-center md:gap-10 md:p-8">
      <section className="space-y-4 md:order-1">
        <PlanArt className="h-40 w-full object-cover md:h-auto md:rounded-xl md:border md:border-plan-line" />
        <div className="space-y-2 px-4 md:px-0">
          <Logo />
          <h1 className="text-2xl font-semibold tracking-tight">El almacén de tu club, en un plano.</h1>
        </div>
      </section>
      <div className="w-full max-w-sm space-y-6 p-4 md:order-2 md:mx-auto md:p-0">
        {/* Con Cache Components, searchParams solo se puede leer dentro de un <Suspense>. */}
        <Suspense fallback={null}>
          <LoginFormFromParams searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginFormFromParams({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(next)} />;
}
