'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { defaultDueDate, todayInMadrid } from '@/lib/dates';
import { checkoutAction } from './actions';

export function CheckoutForm({ itemId, groupId, available }: { itemId: string; groupId: string; available: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

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
    setDone(true);
    setPurpose('');
    setQuantity(1);
    setPhotoPath(null);
    setPhotoKey((k) => k + 1);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="co-qty">Cantidad</Label>
          <Input id="co-qty" type="number" min={1} max={available} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="co-due">Lo devuelvo el</Label>
          <Input id="co-due" type="date" required min={todayInMadrid()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="co-purpose">¿Para qué?</Label>
        <Input id="co-purpose" required maxLength={120} placeholder="Campamento de verano" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </div>
      <PhotoCapture key={photoKey} groupId={groupId} kind="loans" label="Foto del material (obligatoria)" onUploaded={(p) => setPhotoPath(p)} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {done && !error && <p role="status" className="text-sm text-green-700">Préstamo registrado.</p>}
      <Button type="submit" disabled={pending || !photoPath} className="w-full">{pending ? 'Registrando…' : 'Coger'}</Button>
    </form>
  );
}
