import Link from 'next/link';
import { cn } from 'cn';

/** Marca tipográfica "zulo" con un punto --signal, como la cabeza de un alfiler en un plano. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <span role="img" aria-label="Zulo" className="inline-flex items-baseline text-lg font-bold tracking-tight">
        zulo
        <span aria-hidden="true" className="ml-0.5 size-1.5 rounded-full bg-signal" />
      </span>
    </Link>
  );
}
