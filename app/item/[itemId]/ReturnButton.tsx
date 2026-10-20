'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveSheet } from '@/components/ResponsiveSheet';
import { ReturnForm } from './ReturnForm';

type Props = { loanId: string; groupId: string; itemName: string; beforeUrl: string | null; beforeDate: string; defaultOpen?: boolean };

export function ReturnButton({ loanId, groupId, itemName, beforeUrl, beforeDate, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Devolver
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={`Devolver: ${itemName}`}>
        <ReturnForm loanId={loanId} groupId={groupId} beforeUrl={beforeUrl} beforeDate={beforeDate} />
      </ResponsiveSheet>
    </>
  );
}
