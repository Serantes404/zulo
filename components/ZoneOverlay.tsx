import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Clock, TriangleAlert } from 'lucide-react';
import type { ZoneStatus } from '@/lib/availability';
import { zoneCssVars, zoneMark } from '@/lib/zoneStyle';

type Geometry = { x: number; y: number; w: number; h: number };
type Props = {
  label: string;
  color: string;
  /** Posición normalizada 0-1; sin ella la zona llena a su padre (editor, dentro de Rnd). */
  geometry?: Geometry;
  status?: ZoneStatus;
  selected?: boolean;
  dim?: boolean;
  hit?: boolean;
  /** Sin `onClick` se pinta como <div> inerte; con él, como <button>. */
  onClick?: () => void;
  ariaLabel?: string;
  children?: ReactNode;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'>;

export function ZoneOverlay({
  label, color, geometry, status = 'ok', selected, dim, hit, onClick, ariaLabel, children, 'aria-pressed': pressed,
}: Props) {
  const mark = zoneMark(status);
  const style: CSSProperties = {
    ...(zoneCssVars(color) as CSSProperties),
    ...(geometry
      ? { left: `${geometry.x * 100}%`, top: `${geometry.y * 100}%`, width: `${geometry.w * 100}%`, height: `${geometry.h * 100}%` }
      : { inset: 0 }),
  };
  const data = {
    'data-selected': selected ? 'true' : undefined,
    'data-dim': dim ? 'true' : undefined,
    'data-hit': hit ? 'true' : undefined,
    'data-overdue': status === 'overdue' ? 'true' : undefined,
  };
  const inner = (
    <>
      <span className="zone-chip">{label}</span>
      {mark && (
        <span className="zone-mark" data-tone={mark.tone} aria-hidden="true">
          {mark.tone === 'danger' ? <TriangleAlert size={12} /> : <Clock size={12} />}
        </span>
      )}
      {children}
    </>
  );
  if (!onClick) {
    return <div className="zone-overlay" style={style} {...data}>{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={ariaLabel ?? `${label}${mark ? `, ${mark.text}` : ''}`}
      className="zone-overlay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-ink)]"
      style={style}
      {...data}
    >
      {inner}
    </button>
  );
}
