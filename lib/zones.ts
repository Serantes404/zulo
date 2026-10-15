import { MAX_ZONES, type Zone } from '@/lib/ai/normalize';
import { uuid } from './uuid';

export const PALETTE = ['#E4572E', '#2E86AB', '#3BB273', '#F2A541', '#8E5DB8', '#D64C8C', '#1B998B', '#6C757D'] as const;
export const MIN_SIZE = 0.02;

export type EditableZone = {
  id?: string;
  key: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export function fromDetected(zones: Zone[], makeKey: () => string = uuid): EditableZone[] {
  return zones.map((z, i) => ({
    key: makeKey(),
    label: z.label,
    color: PALETTE[i % PALETTE.length],
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
  }));
}

export function newZone(index: number, makeKey: () => string = uuid): EditableZone {
  return { key: makeKey(), label: `Zona ${index + 1}`, color: PALETTE[index % PALETTE.length], x: 0.4, y: 0.4, w: 0.2, h: 0.2 };
}

export function clampZone(z: EditableZone): EditableZone {
  const w = Math.min(1, Math.max(MIN_SIZE, z.w));
  const h = Math.min(1, Math.max(MIN_SIZE, z.h));
  const x = Math.min(1 - w, Math.max(0, z.x));
  const y = Math.min(1 - h, Math.max(0, z.y));
  return { ...z, x, y, w, h };
}

export function validateZones(zones: EditableZone[]): string | null {
  if (zones.length > MAX_ZONES) return `Máximo ${MAX_ZONES} zonas por almacén.`;
  for (const z of zones) {
    if (!z.label.trim()) return 'Todas las zonas necesitan un nombre.';
    if (z.label.trim().length > 60) return 'Los nombres de zona tienen un máximo de 60 caracteres.';
    if (!(PALETTE as readonly string[]).includes(z.color)) return 'Color no válido.';
    if (![z.x, z.y, z.w, z.h].every(Number.isFinite)) return 'Hay una zona con una posición no válida.';
  }
  return null;
}
