import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, HandCoins, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/Logo';
import { buttonVariants } from '@/components/ui/button';
import { PlanArt } from './login/PlanArt';

export const metadata: Metadata = {
  title: { absolute: 'Zulo · El material de tu club, siempre localizado' },
  description:
    'Zulo ayuda a los responsables de material de clubs a saber qué hay en el almacén, dónde está y quién se lo ha llevado.',
};

const STEPS = [
  { icon: Camera, title: 'Haz una foto del almacén', text: 'La IA dibuja el plano y marca las zonas: estantería, armario, cajas…' },
  { icon: MapPin, title: 'Apunta el material por zona', text: 'Cualquiera del club ve qué hay y dónde está, desde el móvil.' },
  { icon: HandCoins, title: 'Presta con foto y fecha', text: 'Quién se lo llevó, cuándo lo devuelve y en qué estado vuelve.' },
];

/** Portada pública: qué es, para quién y un único botón para crear cuenta. Con sesión es "Qué es Zulo" y el botón va a /app. */
export default function Landing() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-12">
      {/* Con sesión ya está la cabecera de la app: esta barra solo se pinta sin sesión. */}
      <Suspense fallback={null}>
        <GuestNav />
      </Suspense>

      <section className="grid gap-8 pt-6 md:grid-cols-2 md:items-center md:pt-12">
        <div className="space-y-5">
          <p className="font-mono text-xs font-medium tracking-[0.12em] text-signal-ink uppercase">Para clubs</p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
            El material de tu club, siempre localizado.
          </h1>
          <p className="text-lg text-muted-foreground">
            <span translate="no">Zulo</span> ayuda a los responsables de material de clubs a saber qué hay en el almacén, dónde está y quién se lo ha llevado.
          </p>
          <Suspense fallback={<PrimaryCta loggedIn={false} />}>
            <SessionCta />
          </Suspense>
        </div>
        <PlanArt className="w-full rounded-xl border border-plan-line" />
      </section>

      <section aria-labelledby="como-title" className="mt-14 space-y-4">
        <h2 id="como-title" className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Cómo funciona</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="space-y-2 rounded-xl border bg-card p-4">
              <Icon aria-hidden="true" className="size-5 text-signal-ink" />
              <h3 className="font-semibold">
                <span className="sr-only">Paso {i + 1}: </span>
                {title}
              </h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

async function isLoggedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

function PrimaryCta({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="space-y-3">
      <Link href={loggedIn ? '/app' : '/signup'} className={buttonVariants({ size: 'lg', className: 'h-12 px-6 text-base' })}>
        {loggedIn ? 'Ir a mis grupos' : '¡Empieza a organizar!'}
        <ArrowRight aria-hidden="true" />
      </Link>
      {!loggedIn && <p className="text-sm text-muted-foreground">Gratis. Solo email y contraseña.</p>}
    </div>
  );
}

// Con Cache Components, la sesión solo se lee dentro de un <Suspense>.
async function SessionCta() {
  return <PrimaryCta loggedIn={await isLoggedIn()} />;
}

async function GuestNav() {
  if (await isLoggedIn()) return null;
  return (
    <nav aria-label="Cuenta" className="flex h-14 items-center justify-between">
      <Logo href="/" />
      <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline">
        Entrar
      </Link>
    </nav>
  );
}
