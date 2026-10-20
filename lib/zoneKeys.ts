// Alternativa de teclado al arrastre del editor de zonas (WCAG 2.1.1). Coordenadas normalizadas 0-1.
import { clampZone, type EditableZone } from './zones';

export const NUDGE = 0.02;
export const NUDGE_BIG = 0.1;

export type ZoneNudge = { kind: 'move' | 'resize'; dx: number; dy: number };

const DIRS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type Mods = { shift?: boolean; alt?: boolean; ctrl?: boolean; meta?: boolean };

/**
 * Flechas: mover un 2 % (Mayús: 10 %). Mayús + Alt + flechas: tamaño un 2 % (derecha/abajo crecen).
 * Alt solo no hace nada (Alt + ←/→ es Atrás/Adelante en Windows/Linux y se perderían los cambios),
 * y Ctrl/Cmd se dejan a los atajos del sistema.
 */
export function zoneKeyAction(key: string, mods: Mods): ZoneNudge | null {
  const dir = DIRS[key];
  if (!dir || mods.ctrl || mods.meta) return null;
  if (mods.alt) return mods.shift ? { kind: 'resize', dx: dir[0] * NUDGE, dy: dir[1] * NUDGE } : null;
  const step = mods.shift ? NUDGE_BIG : NUDGE;
  return { kind: 'move', dx: dir[0] * step, dy: dir[1] * step };
}

/** Aplica el ajuste y deja la zona dentro del plano (clampZone). La esquina superior izquierda queda fija al cambiar el tamaño. */
export function nudgeZone(z: EditableZone, n: ZoneNudge): EditableZone {
  return n.kind === 'move'
    ? clampZone({ ...z, x: z.x + n.dx, y: z.y + n.dy })
    : clampZone({ ...z, w: z.w + n.dx, h: z.h + n.dy });
}

/** Área táctil de las asas de cambio de tamaño (WCAG 2.5.5). */
export const HANDLE_HIT = 44;

export type HandleRect = { x: number; y: number; w: number; h: number };
export type HandleRects = Record<'top' | 'bottom' | 'left' | 'right' | 'bottomRight', HandleRect>;

/**
 * Áreas de las asas en px, relativas a la esquina superior izquierda de la zona (de w × h px).
 * Cada asa se centra en su borde (o en la esquina) y mide como mucho la mitad del lado, así que
 * entra como máximo un cuarto en la zona: el centro siempre queda libre para arrastrar y las asas no se solapan.
 */
export function handleRects(w: number, h: number): HandleRects {
  const hx = Math.min(HANDLE_HIT, w / 2); // ancho de las asas de arriba/abajo y de izquierda/derecha
  const hy = Math.min(HANDLE_HIT, h / 2);
  const c = Math.min(HANDLE_HIT, w / 2, h / 2);
  return {
    top: { x: (w - hx) / 2, y: -hy / 2, w: hx, h: hy },
    bottom: { x: (w - hx) / 2, y: h - hy / 2, w: hx, h: hy },
    left: { x: -hx / 2, y: (h - hy) / 2, w: hx, h: hy },
    right: { x: w - hx / 2, y: (h - hy) / 2, w: hx, h: hy },
    bottomRight: { x: w - c / 2, y: h - c / 2, w: c, h: c },
  };
}
