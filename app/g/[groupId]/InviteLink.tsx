'use client';
import { useTransition, useSyncExternalStore } from 'react';
import { Copy, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/toaster';

const noSubscribe = () => () => {};

export function InviteLink({ code, groupName, onRegenerate }: { code: string; groupName: string; onRegenerate: () => Promise<{ ok: true } | { error: string }> }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  // El origin y navigator.share solo existen en el navegador; en el servidor se renderizan vacíos.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === 'function', () => false);
  const url = origin ? `${origin}/join/${code}` : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado' });
    } catch {
      toast({ title: 'No se ha podido copiar', description: 'Copia el link a mano.', variant: 'error' });
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `Únete a ${groupName} en Zulo`, url });
    } catch {
      // El usuario cerró el selector: no es un error.
    }
  }

  function regenerate() {
    startTransition(async () => {
      try {
        const r = await onRegenerate();
        if ('error' in r) toast({ title: 'No se ha podido crear el link', description: r.error, variant: 'error' });
        else toast({ title: 'Link nuevo creado', description: 'El anterior ya no funciona.' });
      } catch {
        toast({ title: 'No se ha podido crear el link', variant: 'error' });
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="truncate rounded-md bg-muted px-3 py-2 font-mono text-sm" title={url}>{url || ' '}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copy} disabled={!url}>
          <Copy aria-hidden="true" /> Copiar link
        </Button>
        {canShare && (
          <Button type="button" variant="outline" onClick={share} disabled={!url}>
            <Share2 aria-hidden="true" /> Compartir
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger render={<Button type="button" variant="outline" disabled={pending} />}>
            <RefreshCw aria-hidden="true" /> Nuevo link
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Crear un link nuevo?</AlertDialogTitle>
              <AlertDialogDescription>El link actual dejará de funcionar. No se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={regenerate}>Crear link nuevo</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
