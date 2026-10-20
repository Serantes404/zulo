'use client';
import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveSheet } from '@/components/ResponsiveSheet';
import { CheckoutForm } from './CheckoutForm';

type Props = { itemId: string; itemName: string; groupId: string; available: number };

/** Barra fija inferior con "Coger material"; sin unidades libres queda desactivada y lo dice. */
export function TakeBar({ itemId, itemName, groupId, available }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto max-w-3xl p-3">
        <Button size="lg" className="w-full" disabled={available <= 0} aria-describedby={available <= 0 ? 'take-none' : undefined} onClick={() => setOpen(true)}>
          <ArrowUp aria-hidden="true" />
          Coger material
        </Button>
        {available <= 0 && (
          <p id="take-none" className="mt-1 text-center text-xs text-muted-foreground">No quedan unidades libres</p>
        )}
      </div>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={`Coger: ${itemName}`}>
        <CheckoutForm itemId={itemId} groupId={groupId} available={available} onDone={() => setOpen(false)} />
      </ResponsiveSheet>
    </div>
  );
}
