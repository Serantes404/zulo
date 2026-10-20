'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto max-w-sm p-4 pt-8">
      <EmptyState
        as="h1"
        icon={MapPinOff}
        title="Algo ha salido mal"
        description="No hemos podido cargar esta página. Inténtalo de nuevo."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={() => retry()}>
              Reintentar
            </Button>
            <Link href="/" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              Volver a mis grupos
            </Link>
          </div>
        }
      />
    </main>
  );
}
