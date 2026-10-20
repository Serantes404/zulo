'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleDashed, TriangleAlert, type LucideIcon } from 'lucide-react';
import { PhotoCapture } from '@/components/PhotoCapture';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toaster';
import type { ReturnCondition } from '@/lib/loans';
import { returnAction } from './actions';

const OPTIONS: { value: ReturnCondition; label: string; icon: LucideIcon }[] = [
  { value: 'ok', label: 'Bien', icon: Check },
  { value: 'damaged', label: 'Con daños', icon: TriangleAlert },
  { value: 'incomplete', label: 'Incompleto', icon: CircleDashed },
];

type Props = {
  loanId: string;
  groupId: string;
  /** Foto al coger (URL firmada) y su fecha corta, para la comparación Antes | Después. */
  beforeUrl: string | null;
  beforeDate: string;
};

export function ReturnForm({ loanId, groupId, beforeUrl, beforeDate }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [condition, setCondition] = useState<ReturnCondition>('ok');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoPath) {
      setError('Haz una foto del material al devolverlo.');
      return;
    }
    setPending(true);
    setError(null);
    const r = await returnAction({ loanId, photoPath, condition, notes });
    if ('error' in r) {
      setPending(false);
      setError(r.error);
      router.refresh();
      return;
    }
    toast({ title: 'Devuelto' });
    router.push(`/loan/${loanId}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <section className="space-y-2" aria-labelledby={`rt-photo-${loanId}`}>
          <h3 id={`rt-photo-${loanId}`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            1 · Foto al devolver
          </h3>
          <PhotoCapture
            groupId={groupId}
            kind="loans"
            variant="zone"
            label="Hacer foto al material"
            onUploaded={(p, file) => {
              setPhotoPath(p);
              setAfterUrl((old) => {
                if (old) URL.revokeObjectURL(old);
                return URL.createObjectURL(file);
              });
            }}
          />
        </section>
        <section className="space-y-3" aria-labelledby={`rt-det-${loanId}`}>
          <h3 id={`rt-det-${loanId}`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            2 · Estado
          </h3>
          <RadioGroup
            aria-label="¿En qué estado vuelve?"
            value={condition}
            onValueChange={(v) => setCondition(v as ReturnCondition)}
            className="grid-cols-3"
          >
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-sm font-medium has-data-checked:border-primary has-data-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring"
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
                <RadioGroupItem value={value} className="mt-1" />
              </label>
            ))}
          </RadioGroup>
          <div className="space-y-1">
            <Label htmlFor={`notes-${loanId}`}>Notas (opcional)</Label>
            <Textarea id={`notes-${loanId}`} maxLength={500} placeholder="Falta una piqueta" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>
        <section className="space-y-2" aria-label="Comparación antes y después">
          <div className="grid grid-cols-2 gap-3">
            <figure className="space-y-1">
              <figcaption className="text-xs font-medium text-muted-foreground">Antes · {beforeDate}</figcaption>
              {beforeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={beforeUrl} alt="Material al cogerlo" className="aspect-[4/3] w-full rounded-lg border object-cover" />
              ) : (
                <div className="aspect-[4/3] w-full rounded-lg border bg-muted" />
              )}
            </figure>
            <figure className="space-y-1">
              <figcaption className="text-xs font-medium text-muted-foreground">Después · hoy</figcaption>
              {afterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={afterUrl} alt="Material al devolverlo" className="aspect-[4/3] w-full rounded-lg border object-cover" />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">Pendiente</div>
              )}
            </figure>
          </div>
        </section>
        <FormError id={`rt-error-${loanId}`}>{error}</FormError>
      </div>
      <div className="border-t p-4">
        <Button type="submit" size="lg" disabled={pending || !photoPath} className="w-full">
          {pending ? 'Registrando…' : 'Confirmar devolución'}
        </Button>
      </div>
    </form>
  );
}
