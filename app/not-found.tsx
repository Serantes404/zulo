import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-sm p-4 pt-8">
      <EmptyState
        as="h1"
        icon={MapPinOff}
        title="No encontramos esta página"
        description="Puede que el enlace sea incorrecto o que ya no tengas acceso."
        action={
          <Link href="/" className={buttonVariants({ size: 'lg' })}>
            Volver a mis grupos
          </Link>
        }
      />
    </main>
  );
}
