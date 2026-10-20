import { describe, it, expect } from 'vitest';
import { HANDLE_HIT, NUDGE, NUDGE_BIG, handleRects, nudgeZone, zoneKeyAction } from './zoneKeys';
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
  it('Mayús + Alt + flechas cambia el tamaño un 2 % (derecha/abajo crecen)', () => {
    expect(zoneKeyAction('ArrowRight', { alt: true, shift: true })).toEqual({ kind: 'resize', dx: NUDGE, dy: 0 });
    expect(zoneKeyAction('ArrowUp', { alt: true, shift: true })).toEqual({ kind: 'resize', dx: 0, dy: -NUDGE });
  });
  it('Alt solo no hace nada (Alt + ←/→ es Atrás/Adelante del navegador)', () => {
    expect(zoneKeyAction('ArrowLeft', { alt: true })).toBeNull();
    expect(zoneKeyAction('ArrowRight', { alt: true })).toBeNull();
  });
  it('Ctrl o Cmd no hacen nada (atajos del sistema)', () => {
    expect(zoneKeyAction('ArrowLeft', { ctrl: true })).toBeNull();
    expect(zoneKeyAction('ArrowUp', { meta: true, shift: true })).toBeNull();
    expect(zoneKeyAction('ArrowUp', { meta: true, alt: true, shift: true })).toBeNull();
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

describe('handleRects', () => {
  type R = { x: number; y: number; w: number; h: number };
  const contains = (r: R, px: number, py: number) => px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h;
  const overlap = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const sizes: [number, number][] = [[300, 200], [80, 60], [44, 44], [30, 20], [12, 90], [8, 8]];

  it('zona grande: áreas de 44 px centradas en cada borde y en la esquina', () => {
    const r = handleRects(300, 200);
    expect(HANDLE_HIT).toBe(44);
    expect(r.top).toEqual({ x: 128, y: -22, w: 44, h: 44 });
    expect(r.bottom).toEqual({ x: 128, y: 178, w: 44, h: 44 });
    expect(r.left).toEqual({ x: -22, y: 78, w: 44, h: 44 });
    expect(r.right).toEqual({ x: 278, y: 78, w: 44, h: 44 });
    expect(r.bottomRight).toEqual({ x: 278, y: 178, w: 44, h: 44 });
  });
  it.each(sizes)('zona %ix%i: el centro sigue libre para arrastrar', (w, h) => {
    for (const rect of Object.values(handleRects(w, h))) expect(contains(rect, w / 2, h / 2)).toBe(false);
  });
  it.each(sizes)('zona %ix%i: ninguna asa entra más de un cuarto en la zona', (w, h) => {
    const r = handleRects(w, h);
    expect(r.top.y + r.top.h).toBeLessThanOrEqual(h / 4);
    expect(r.bottom.y).toBeGreaterThanOrEqual((3 * h) / 4);
    expect(r.left.x + r.left.w).toBeLessThanOrEqual(w / 4);
    expect(r.right.x).toBeGreaterThanOrEqual((3 * w) / 4);
    expect(r.bottomRight.x).toBeGreaterThanOrEqual((3 * w) / 4);
    expect(r.bottomRight.y).toBeGreaterThanOrEqual((3 * h) / 4);
  });
  it.each(sizes)('zona %ix%i: las asas no se solapan entre sí', (w, h) => {
    const list = Object.values(handleRects(w, h));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(overlap(list[i], list[j])).toBe(false);
  });
});
