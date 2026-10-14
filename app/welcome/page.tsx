import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { safeNext } from '@/lib/safeNext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveName } from './actions';

type SearchParams = Promise<{ next?: string }>;

export default function WelcomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-sm space-y-6 p-4 pt-16">
      <h1 className="text-2xl font-semibold">¡Bienvenido!</h1>
      {/* Con Cache Components, la sesión y searchParams solo se leen dentro de un <Suspense>. */}
      <Suspense fallback={null}>
        <WelcomeForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function WelcomeForm({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  await requireUser();
  return (
    <form action={saveName.bind(null, safeNext(next))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">¿Cómo te llamas?</Label>
        <Input id="full_name" name="full_name" required maxLength={80} autoComplete="name" />
        <p className="text-xs text-muted-foreground">Lo verán los demás miembros de tus grupos.</p>
      </div>
      <Button type="submit" className="w-full">Continuar</Button>
    </form>
  );
}
