'use client';
import { useId, useRef, useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormError } from '@/components/FormError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteGroup } from './actions';

/** Zona peligrosa de la página Grupo (solo admins): borrar el grupo escribiendo su nombre. */
export function DeleteGroup({ groupId, groupName }: { groupId: string; groupName: string }) {
  const inputId = useId();
  const errorId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = typed.trim() === groupName;

  function onOpenChange(o: boolean) {
    if (pending) return;
    setOpen(o);
    if (!o) {
      setTyped('');
      setError(null);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setError(null);
    // Si va bien, deleteGroup redirige a la portada.
    startTransition(async () => {
      const r = await deleteGroup(groupId, typed);
      if (r?.error) {
        setError(r.error);
        inputRef.current?.focus();
      }
    });
  }

  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-xl border border-destructive/40 p-4">
      <h2 id={titleId} className="font-semibold">Eliminar grupo</h2>
      <p className="text-sm text-muted-foreground">
        Se borran para siempre los almacenes, el material, los préstamos y todas las fotos. Nadie podrá volver a entrar.
      </p>
      <Button variant="destructive" size="lg" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" /> Eliminar grupo
      </Button>

      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <form onSubmit={onSubmit} className="contents">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar «{groupName}»?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borran para siempre sus almacenes, el material, los préstamos (también los activos) y todas las fotos.
                Todos los miembros pierden el acceso. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor={inputId}>Escribe el nombre del grupo para confirmar</Label>
              <Input
                ref={inputRef}
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                placeholder={groupName}
                readOnly={pending}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error && <FormError id={errorId}>{error}</FormError>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={!matches || pending}>
                {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
                {pending ? 'Eliminando…' : 'Eliminar grupo'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
