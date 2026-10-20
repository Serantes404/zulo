'use client';
import { useActionState, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormError } from '@/components/FormError';
import { MIN_PASSWORD } from '@/lib/authForm';
import { signIn, signUp, type AuthState } from './actions';

type Mode = 'signin' | 'signup';

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>('signin');
  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
      <TabsList>
        <TabsTrigger value="signin">Entrar</TabsTrigger>
        <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
      </TabsList>
      {/* key: al cambiar de modo se reinicia el formulario y su estado. */}
      <TabsContent value="signin">
        <CredentialsForm key="signin" next={next} isSignup={false} />
      </TabsContent>
      <TabsContent value="signup">
        <CredentialsForm key="signup" next={next} isSignup />
      </TabsContent>
    </Tabs>
  );
}

function CredentialsForm({ next, isSignup }: { next: string; isSignup: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(isSignup ? signUp : signIn, {});
  const [show, setShow] = useState(false);
  const describedBy = [isSignup ? 'password-hint' : null, state.error ? 'password-error' : null]
    .filter(Boolean)
    .join(' ');
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@email.com" />
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
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'Un momento…' : isSignup ? 'Crear cuenta' : 'Entrar'}
      </Button>
    </form>
  );
}
