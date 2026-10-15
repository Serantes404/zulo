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

  it('devuelve TIMEOUT si tarda más de AI_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    const call = (_b64: string, signal?: AbortSignal) =>
      new Promise<string>((_, reject) => signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const p = detectZonesFromImage('b64', img, call);
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS);
    expect(await p).toEqual({ ok: false, reason: 'TIMEOUT' });
  });
});
