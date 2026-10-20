import type { ZoneStatus } from './availability';
import { zoneSwatch } from './zoneColors';

// Variables CSS de una zona para claro y oscuro; globals.css elige con prefers-color-scheme (sin JS).
export function zoneCssVars(stored: string): Record<string, string> {
  const s = zoneSwatch(stored);
  return {
    '--zone-fill': s.light.fill,
    '--zone-border': s.light.border,
    '--zone-chip-bg': s.light.chipBg,
    '--zone-chip-text': s.light.chipText,
    '--zone-fill-dark': s.dark.fill,
    '--zone-border-dark': s.dark.border,
    '--zone-chip-bg-dark': s.dark.chipBg,
    '--zone-chip-text-dark': s.dark.chipText,
  };
}

export type ZoneMark = { text: string; tone: 'warning' | 'danger' };

// Marca de estado en la esquina: siempre icono + texto (el texto va al nombre accesible).
export function zoneMark(status: ZoneStatus): ZoneMark | null {
  if (status === 'overdue') return { text: 'Vencido', tone: 'danger' };
  if (status === 'out') return { text: 'Prestado', tone: 'warning' };
  return null;
}
