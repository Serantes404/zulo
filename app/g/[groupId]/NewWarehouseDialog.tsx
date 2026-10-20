'use client';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createWarehouse } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Creando…' : 'Crear almacén'}</Button>;
}

export function NewWarehouseDialog({ groupId, variant = 'ghost' }: { groupId: string; variant?: 'ghost' | 'default' }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant={variant} size={variant === 'ghost' ? 'sm' : 'default'} />}>
        <Plus aria-hidden="true" /> {variant === 'ghost' ? 'Nuevo' : 'Crear almacén'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo almacén</DialogTitle>
          <DialogDescription>Después podrás dibujar su plano.</DialogDescription>
        </DialogHeader>
        {/* createWarehouse redirige al editor del plano. */}
        <form action={createWarehouse.bind(null, groupId)} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="wh-name">Nombre del almacén</Label>
            <Input id="wh-name" name="name" required maxLength={80} placeholder="Zulo del local" autoComplete="off" />
          </div>
          <Submit />
        </form>
      </DialogContent>
    </Dialog>
  );
}
