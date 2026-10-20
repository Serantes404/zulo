import type { CSSProperties } from 'react';
import { cn } from 'cn';
import { zoneCssVars } from '@/lib/zoneStyle';

/** Chip sólido con el color de la zona (claro/oscuro). El texto es el nombre: el color nunca va solo. */
export function ZoneChip({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span
      style={zoneCssVars(color) as CSSProperties}
      className={cn(
        'inline-flex max-w-full items-center truncate rounded px-1.5 text-xs leading-[18px] font-semibold',
        'bg-[var(--zone-chip-bg)] text-[var(--zone-chip-text)] dark:bg-[var(--zone-chip-bg-dark)] dark:text-[var(--zone-chip-text-dark)]',
        className,
      )}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
