'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { PhotoCapture } from '@/components/PhotoCapture';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { defaultDueDate, todayInMadrid } from '@/lib/dates';
import { checkoutAction } from './actions';

type Props = { itemId: string; groupId: string; available: number; onDone: () => void };

export function CheckoutForm({ itemId, groupId, available, onDone }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const clamp = (n: number) => Math.min(available, Math.max(1, Number.isFinite(n) ? n : 1));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoPath) {
      setError('Haz una foto del material antes de llevártelo.');
      return;
    }
    setPending(true);
    setError(null);
    const r = await checkoutAction({ itemId, quantity, purpose, dueDate, photoPath });
    setPending(false);
    if ('error' in r) {
      setError(r.error);
      router.refresh();
      return;
    }
    toast({ title: 'Préstamo registrado' });
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <section className="space-y-2" aria-labelledby="co-step-photo">
          <h3 id="co-step-photo" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            1 · Foto del material
          </h3>
          <PhotoCapture groupId={groupId} kind="loans" variant="zone" label="Hacer foto al material" onUploaded={(p) => setPhotoPath(p)} />
        </section>
        <section className="space-y-3" aria-labelledby="co-step-details">
          <h3 id="co-step-details" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            2 · Detalles
          </h3>
          <div className="space-y-1">
            <Label htmlFor="co-qty">Cantidad</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Quitar una unidad" disabled={quantity <= 1} onClick={() => setQuantity((q) => clamp(q - 1))}>
                <Minus aria-hidden="true" />
              </Button>
              <Input id="co-qty" type="number" inputMode="numeric" min={1} max={available} required className="w-20 text-center" value={quantity} onChange={(e) => setQuantity(clamp(Number(e.target.value)))} />
              <Button type="button" variant="outline" size="icon-lg" aria-label="Añadir una unidad" disabled={quantity >= available} onClick={() => setQuantity((q) => clamp(q + 1))}>
                <Plus aria-hidden="true" />
              </Button>
              <span className="text-sm text-muted-foreground">máx. {available}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="co-purpose">Para qué</Label>
            <Input id="co-purpose" required maxLength={120} placeholder="Campamento de verano" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="co-due">Devolver antes del</Label>
            <Input id="co-due" type="date" required min={todayInMadrid()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </section>
        <FormError id="co-error">{error}</FormError>
      </div>
      <div className="border-t p-4">
        <Button type="submit" size="lg" disabled={pending || !photoPath} className="w-full">
          {pending ? 'Registrando…' : 'Confirmar préstamo'}
        </Button>
        {!photoPath && <p className="mt-2 text-center text-xs text-muted-foreground">Sube la foto del material para confirmar.</p>}
      </div>
    </form>
  );
}
