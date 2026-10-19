import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectZonesFromImage, AI_TIMEOUT_MS } from './detectZones';

const img = { width: 1000, height: 1000 };
const good = JSON.stringify({ zones: [{ label: 'Cocina', box: [0, 0, 500, 500] }] });

beforeEach(() => {
  vi.stubEnv('AI_BOX_FORMAT', 'relative1000');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('detectZonesFromImage', () => {
  it('devuelve zonas al primer intento', async () => {
    const call = vi.fn().mockResolvedValue(good);
    const r = await detectZonesFromImage('b64', img, call);
    expect(call).toHaveBeenCalledTimes(1);
    expect(r.ok && r.zones[0].label).toBe('Cocina');
  });

  it('reintenta una vez si la respuesta no es válida', async () => {
    const call = vi.fn().mockResolvedValueOnce('basura').mockResolvedValueOnce(good);
    const r = await detectZonesFromImage('b64', img, call);
    expect(call).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(true);
  });

  it('devuelve NO_ZONES tras dos respuestas inválidas', async () => {
    const call = vi.fn().mockResolvedValue('{"zones":[]}');
    expect(await detectZonesFromImage('b64', img, call)).toEqual({ ok: false, reason: 'NO_ZONES' });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('devuelve UNAVAILABLE si la llamada falla', async () => {
    const call = vi.fn().mockRejectedValue(new Error('GEMINI_HTTP_500'));
    expect(await detectZonesFromImage('b64', img, call)).toEqual({ ok: false, reason: 'UNAVAILABLE' });
  });

  const sketch = JSON.stringify({
    room: { box_2d: [0, 0, 1000, 1000] },
    doors: [{ wall: 'left', start: 700, end: 800 }],
    corridors: [],
    zones: [{ label: 'Menaje', box_2d: [0, 0, 500, 500] }],
  });

  it('en modo sketch pasa el modo a la llamada y devuelve layout y proporción', async () => {
    const call = vi.fn().mockResolvedValue(sketch);
    const r = await detectZonesFromImage('b64', img, call, 'sketch');
    expect(call).toHaveBeenCalledWith('b64', expect.any(AbortSignal), 'sketch');
    expect(r.ok && r.zones[0].label).toBe('Menaje');
    expect(r.ok && r.layout?.doors).toEqual([{ wall: 'left', start: 0.7, end: 0.8 }]);
    expect(r.ok && r.aspectRatio).toBe(1);
  });

  it('en modo sketch reintenta si la respuesta no sirve y acaba en NO_ZONES', async () => {
    const call = vi.fn().mockResolvedValue('{"room":{"box_2d":[0,0,1000,1000]},"zones":[]}');
    expect(await detectZonesFromImage('b64', img, call, 'sketch')).toEqual({ ok: false, reason: 'NO_ZONES' });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('en modo foto no devuelve layout', async () => {
    const call = vi.fn().mockResolvedValue(good);
    const r = await detectZonesFromImage('b64', img, call);
    expect(call).toHaveBeenCalledWith('b64', expect.any(AbortSignal), 'photo');
    expect(r.ok && r.layout).toBeUndefined();
  });

  it('devuelve TIMEOUT si tarda más de AI_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    const call = (_b64: string, signal?: AbortSignal) =>
      new Promise<string>((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const p = detectZonesFromImage('b64', img, call);
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS);
    expect(await p).toEqual({ ok: false, reason: 'TIMEOUT' });
  });
});
