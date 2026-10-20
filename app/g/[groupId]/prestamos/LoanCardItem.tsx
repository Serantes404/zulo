import Link from 'next/link';
import { ArrowDownToLine, Check, CircleDashed, Clock, PackageOpen, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ZoneChip } from '@/components/ZoneChip';
import { conditionLabel } from '@/lib/loans';
import type { LoanCard } from '@/lib/myLoans';

function Thumb({ card }: { card: LoanCard }) {
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
      {card.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.photoUrl} alt="" className="size-full object-cover" />
      ) : (
        <PackageOpen aria-hidden="true" className="size-6 text-muted-foreground" />
      )}
    </span>
  );
}

export function ActiveLoanCard({ card }: { card: LoanCard }) {
  return (
    <li className="space-y-3 rounded-xl border bg-card p-3">
      {card.overdue ? (
        <Badge variant="danger"><TriangleAlert aria-hidden="true" />Vencido</Badge>
      ) : (
        <Badge variant="warning"><Clock aria-hidden="true" />Prestado</Badge>
      )}
      <div className="flex items-center gap-3">
        <Thumb card={card} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium">{card.itemName} ×{card.quantity}</p>
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <ZoneChip label={card.zoneLabel} color={card.zoneColor} />
            <span className="shrink-0">{card.overdue ? 'venció' : 'vence'} el {card.dueText}</span>
          </p>
        </div>
      </div>
      <Link
        href={`/item/${card.itemId}?devolver=${card.id}`}
        className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
      >
        <ArrowDownToLine aria-hidden="true" />
        Devolver<span className="sr-only">: {card.itemName}</span>
      </Link>
    </li>
  );
}

export function ReturnedLoanCard({ card }: { card: LoanCard }) {
  const fine = card.condition === 'ok';
  const Icon = fine ? Check : card.condition === 'incomplete' ? CircleDashed : TriangleAlert;
  return (
    <li>
      <Link
        href={`/loan/${card.id}`}
        className="flex min-h-[88px] items-center gap-3 rounded-xl border bg-card p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring"
      >
        <Thumb card={card} />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block truncate font-medium">{card.itemName} ×{card.quantity}</span>
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <ZoneChip label={card.zoneLabel} color={card.zoneColor} />
            {card.returnedText && <span className="shrink-0">devuelto el {card.returnedText}</span>}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Icon aria-hidden="true" className="size-4" />
            {conditionLabel(card.condition)}
          </span>
        </span>
      </Link>
    </li>
  );
}
