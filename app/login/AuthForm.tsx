'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/FormError';
import { MIN_PASSWORD } from '@/lib/authForm';
import { HOME } from '@/lib/safeNext';
import { signIn, signUp, type AuthState } from './actions';

export type AuthMode = 'login' | 'signup';

/** Formulario de /login o /signup. Los data-testid (`login-*`, `signup-*`) son del contrato de evaluación. */
export function AuthForm({ mode, next }: { mode: AuthMode; next: string }) {
  const isSignup = mode === 'signup';
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignup ? signUp : signIn, {});
  const [show, setShow] = useState(false);
  const describedBy = [isSignup ? 'password-hint' : null, state.error ? 'password-error' : null]
    .filter(Boolean)
    .join(' ');
  const other = isSignup ? '/login' : '/signup';
  const otherHref = next === HOME ? other : `${other}?next=${encodeURIComponent(next)}`;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            data-testid={`${mode}-email`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? 'text' : 'password'}
              required
              minLength={MIN_PASSWORD}
              maxLength={72}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              aria-describedby={describedBy || undefined}
              className="pr-12"
              data-testid={`${mode}-password`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          {isSignup && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              Mínimo {MIN_PASSWORD} caracteres.
            </p>
          )}
          <FormError id="password-error">{state.error}</FormError>
        </div>
        {state.info && <p role="status" className="text-sm">{state.info}</p>}
        <Button type="submit" size="lg" disabled={pending} className="w-full" data-testid={`${mode}-submit`}>
          {pending ? 'Un momento…' : isSignup ? 'Crear cuenta' : 'Entrar'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        <Link href={otherHref} className="font-medium text-foreground underline underline-offset-4">
          {isSignup ? 'Entrar' : 'Crear cuenta'}
        </Link>
      </p>
    </div>
  );
}
