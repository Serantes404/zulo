import { describe, it, expect } from 'vitest';
import { NUDGE, NUDGE_BIG, nudgeZone, zoneKeyAction } from './zoneKeys';
import type { EditableZone } from './zones';

const z = (patch: Partial<EditableZone> = {}): EditableZone => ({
  key: 'k', label: 'Tiendas', color: '#E4572E', x: 0.4, y: 0.4, w: 0.2, h: 0.2, ...patch,
});
const close = (a: EditableZone, b: Partial<EditableZone>) =>
  (Object.keys(b) as (keyof EditableZone)[]).forEach((k) => expect(a[k]).toBeCloseTo(b[k] as number, 10));

describe('zoneKeyAction', () => {
  it('flechas mueven un 2 %', () => {
    expect(zoneKeyAction('ArrowLeft', {})).toEqual({ kind: 'move', dx: -NUDGE, dy: 0 });
    expect(zoneKeyAction('ArrowRight', {})).toEqual({ kind: 'move', dx: NUDGE, dy: 0 });
    expect(zoneKeyAction('ArrowUp', {})).toEqual({ kind: 'move', dx: 0, dy: -NUDGE });
    expect(zoneKeyAction('ArrowDown', {})).toEqual({ kind: 'move', dx: 0, dy: NUDGE });
  });
  it('Mayús da pasos grandes', () => {
    expect(NUDGE).toBe(0.02);
    expect(NUDGE_BIG).toBeGreaterThan(NUDGE);
    expect(zoneKeyAction('ArrowRight', { shift: true })).toEqual({ kind: 'move', dx: NUDGE_BIG, dy: 0 });
  });
  it('Alt + flechas cambia el tamaño (derecha/abajo crecen)', () => {
    expect(zoneKeyAction('ArrowRight', { alt: true })).toEqual({ kind: 'resize', dx: NUDGE, dy: 0 });
    expect(zoneKeyAction('ArrowUp', { alt: true, shift: true })).toEqual({ kind: 'resize', dx: 0, dy: -NUDGE_BIG });
  });
  it('otras teclas no hacen nada', () => {
    expect(zoneKeyAction('Enter', {})).toBeNull();
    expect(zoneKeyAction('a', { shift: true })).toBeNull();
  });
});

describe('nudgeZone', () => {
  it('mueve sin cambiar el tamaño', () => {
    close(nudgeZone(z(), { kind: 'move', dx: 0.02, dy: -0.02 }), { x: 0.42, y: 0.38, w: 0.2, h: 0.2 });
  });
  it('no se sale del plano (0..1)', () => {
    close(nudgeZone(z({ x: 0.01 }), { kind: 'move', dx: -0.1, dy: 0 }), { x: 0 });
    close(nudgeZone(z({ x: 0.75 }), { kind: 'move', dx: 0.1, dy: 0 }), { x: 0.8, w: 0.2 });
    close(nudgeZone(z({ y: 0.79 }), { kind: 'move', dx: 0, dy: 0.1 }), { y: 0.8 });
  });
  it('cambia el tamaño desde la esquina superior izquierda fija', () => {
    close(nudgeZone(z(), { kind: 'resize', dx: 0.02, dy: -0.02 }), { x: 0.4, y: 0.4, w: 0.22, h: 0.18 });
  });
  it('respeta el tamaño mínimo y el máximo', () => {
    close(nudgeZone(z({ w: 0.03 }), { kind: 'resize', dx: -0.1, dy: 0 }), { w: 0.02 });
    const big = nudgeZone(z({ x: 0, w: 0.95 }), { kind: 'resize', dx: 0.1, dy: 0 });
    close(big, { x: 0, w: 1 });
  });
  it('no muta la zona original y conserva el resto de campos', () => {
    const orig = z();
    const out = nudgeZone(orig, { kind: 'move', dx: 0.02, dy: 0 });
    expect(orig.x).toBe(0.4);
    expect(out).toMatchObject({ key: 'k', label: 'Tiendas', color: '#E4572E' });
  });
});
