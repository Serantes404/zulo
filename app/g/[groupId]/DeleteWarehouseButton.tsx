'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { deleteWarehouse } from './actions';

type Props = { groupId: string; warehouseId: string; name: string };

export function DeleteWarehouseButton({ groupId, warehouseId, name }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm(`¿Eliminar el almacén «${name}» y su plano? No se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteWarehouse(groupId, warehouseId);
      if (r) setError(r.error);
    });
  }

  return (
    <div className="shrink-0 text-right">
      <Button variant="destructive" size="sm" onClick={onClick} disabled={pending} aria-label={`Eliminar el almacén ${name}`}>
        {pending ? 'Eliminando…' : 'Eliminar'}
      </Button>
      {error && <p role="alert" className="mt-1 max-w-56 text-xs text-red-700">{error}</p>}
    </div>
  );
}
