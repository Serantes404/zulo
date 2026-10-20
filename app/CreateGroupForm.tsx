'use client';
import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/FormError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CREATE_GROUP_INPUT_ID, focusCreateGroup } from '@/lib/focusCreateGroup';
import { createGroup } from './actions';

export function CreateGroupForm({ hasGroups }: { hasGroups: boolean }) {
  // Si va bien, el grupo nuevo aparece en la lista de /app; si no (p. ej. límite de grupos), devuelve el error.
  const [state, formAction, pending] = useActionState(createGroup, null);
  const error = state && 'error' in state ? state.error : undefined;
  // Al llegar con #crear (desde otra página o con otro hash) enfoca el campo una vez montado el formulario.
  useEffect(() => {
    const check = () => {
      if (location.hash === '#crear') focusCreateGroup();
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);
  return (
    <section id="crear" aria-labelledby="crear-title" className="scroll-mt-20 space-y-3">
      {hasGroups && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
        </div>
      )}
      <form action={formAction} className="space-y-2">
        <Label htmlFor={CREATE_GROUP_INPUT_ID} id="crear-title">Crear un grupo nuevo</Label>
        <div className="flex gap-2">
          <Input
            id={CREATE_GROUP_INPUT_ID}
            data-testid="core-input"
            type="text"
            name="name"
            required
            maxLength={80}
            placeholder="Club de Montaña"
            className="h-11"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'crear-error' : undefined}
          />
          <Button type="submit" size="lg" className="h-11 px-5" disabled={pending} data-testid="core-submit">
            {pending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
        <FormError id="crear-error">{error}</FormError>
        <p role="status" className="sr-only">{state && 'ok' in state ? 'Grupo creado.' : ''}</p>
      </form>
    </section>
  );
}
