'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/FormError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGroup } from './actions';

export function CreateGroupForm({ hasGroups }: { hasGroups: boolean }) {
  // Si va bien, createGroup redirige al grupo; si no (p. ej. límite de grupos), devuelve el error.
  const [state, formAction, pending] = useActionState(createGroup, null);
  const error = state?.error;
  return (
    <section id="crear" aria-labelledby="crear-title" className="scroll-mt-20 space-y-3">
      {hasGroups && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
        </div>
      )}
      <form action={formAction} className="space-y-2">
        <Label htmlFor="name" id="crear-title">Crear un grupo nuevo</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            name="name"
            required
            maxLength={80}
            placeholder="Scouts Seeonee"
            className="h-11"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'crear-error' : undefined}
          />
          <Button type="submit" size="lg" className="h-11 px-5" disabled={pending}>
            {pending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
        <FormError id="crear-error">{error}</FormError>
      </form>
    </section>
  );
}
