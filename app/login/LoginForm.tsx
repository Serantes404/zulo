'use client';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_PASSWORD } from '@/lib/authForm';
import { signIn, signUp, type AuthState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const isSignup = mode === 'signup';
  return (
    <div className="space-y-4">
      {/* key: al cambiar de modo se reinicia el formulario y su estado. */}
      <CredentialsForm key={mode} next={next} isSignup={isSignup} />
      <p className="text-center text-sm">
        {isSignup ? '¿Ya tienes cuenta?' : '¿Es tu primera vez?'}{' '}
        <button type="button" className="underline" onClick={() => setMode(isSignup ? 'signin' : 'signup')}>
          {isSignup ? 'Entrar' : 'Crear una cuenta'}
        </button>
      </p>
    </div>
  );
}

function CredentialsForm({ next, isSignup }: { next: string; isSignup: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignup ? signUp : signIn, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD}
          maxLength={72}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          aria-describedby={isSignup ? 'password-hint' : undefined}
        />
        {isSignup && (
          <p id="password-hint" className="text-xs text-muted-foreground">
            Mínimo {MIN_PASSWORD} caracteres.
          </p>
        )}
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.info && <p role="status" className="text-sm">{state.info}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Un momento…' : isSignup ? 'Crear cuenta' : 'Entrar'}
      </Button>
    </form>
  );
}
