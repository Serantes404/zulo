'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Minus, Plus } from 'lucide-react';
import { createItem } from '@/app/g/[groupId]/w/[whId]/actions';
import { itemSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FormError } from '@/components/FormError';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toaster';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
      {pending ? 'Añadiendo…' : 'Añadir'}
    </Button>
  );
}

type Props = { zone: { id: string; label: string }; groupId: string; warehouseId: string };

export function AddItemDialog({ zone, groupId, warehouseId }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName('');
      setQty('1');
      setNotes('');
      setError(null);
    }
  }

  async function submit(formData: FormData) {
    const parsed = itemSchema.safeParse({
      name: formData.get('name'),
      quantity: formData.get('quantity'),
      notes: formData.get('notes') || undefined,
    });
    if (!parsed.success) {
      setError('Revisa el nombre (hasta 80 caracteres) y la cantidad (de 1 a 9999).');
      return;
    }
    // Sin try/catch: si la sesión caducó, el redirect a /login lo gestiona Next.
    const r = await createItem(groupId, warehouseId, zone.id, formData);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setError(null);
    setOpen(false);
    toast({ title: 'Material añadido' });
  }

  const step = (d: number) => setQty(String(Math.min(9999, Math.max(1, (parseInt(qty, 10) || 1) + d))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <Plus aria-hidden="true" /> Añadir material
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir material</DialogTitle>
          <DialogDescription>Se guardará en «{zone.label}».</DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="item-name">Nombre</Label>
            <Input
              id="item-name"
              name="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Linternas"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'item-error' : undefined}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-qty">Cantidad</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Una unidad menos" onClick={() => step(-1)}>
                <Minus aria-hidden="true" />
              </Button>
              <Input
                id="item-qty"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="text-center"
              />
              <Button type="button" variant="outline" size="icon-lg" aria-label="Una unidad más" onClick={() => step(1)}>
                <Plus aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-notes">Notas (opcional)</Label>
            <Textarea id="item-notes" name="notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <FormError id="item-error">{error}</FormError>
          <Submit />
        </form>
      </DialogContent>
    </Dialog>
  );
}
