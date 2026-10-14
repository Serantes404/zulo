'use client';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

const noSubscribe = () => () => {};

export function InviteLink({ code, onRegenerate }: { code: string; onRegenerate: () => Promise<void> }) {
  // El origin solo existe en el navegador; en el servidor se renderiza vacío.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');
  const url = origin ? `${origin}/join/${code}` : '';
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <p className="break-all rounded-md bg-muted p-2 font-mono text-sm">{url}</p>
      <div className="flex gap-2">
        <Button type="button" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar link'}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            if (confirm('El link actual dejará de funcionar. ¿Generar uno nuevo?')) await onRegenerate();
          }}
        >
          Generar nuevo link
        </Button>
      </div>
    </div>
  );
}
