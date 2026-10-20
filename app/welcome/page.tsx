import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { safeNext } from '@/lib/safeNext';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveName } from './actions';

type SearchParams = Promise<{ next?: string }>;

export const metadata: Metadata = { title: 'Tu nombre' };

export default function WelcomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-sm space-y-6 p-4 pt-8">
      <Logo />
      {/* Con Cache Components, la sesión y searchParams solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={null}>
        <WelcomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function WelcomeContent({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  const { supabase, user } = await requireUser();
  const returning = user.user_metadata?.onboarded === true;
  let currentName = '';
  if (returning) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    currentName = data?.full_name ?? '';
  }
  const editing = returning && currentName !== '';
  return (
    <>
      <div className="space-y-2">
        {!editing && <p className="text-xs font-semibold uppercase tracking-widest text-signal-ink">Primer paso</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{editing ? 'Tu nombre' : '¡Hola! ¿Cómo te llamas?'}</h1>
        <p id="full_name-hint" className="text-sm text-muted-foreground">Lo verán los demás miembros de tus grupos.</p>
      </div>
      <form action={saveName.bind(null, safeNext(next))} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Tu nombre</Label>
          <Input id="full_name" name="full_name" required maxLength={80} defaultValue={currentName} autoComplete="name" aria-describedby="full_name-hint" placeholder="Mowgli" />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Continuar
          <ArrowRight aria-hidden="true" />
        </Button>
      </form>
    </>
  );
}
