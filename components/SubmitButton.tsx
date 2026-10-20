'use client';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  children: React.ReactNode;
  /** Texto mientras se envía (p. ej. "Guardando…"). */
  pendingText: string;
  className?: string;
};

/** Botón de envío para un <form action>: se desactiva y muestra un spinner mientras se envía. */
export function SubmitButton({ children, pendingText, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className={className} disabled={pending}>
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
