import { callVisionModel, type VisionMode } from './gemini';
import { normalizeZones, type BoxFormat, type Zone } from './normalize';
import { normalizeSketch } from './layout';
import { parseAiContent } from './schema';
import type { Layout } from '@/lib/layout';

export const AI_TIMEOUT_MS = 55_000;
export const MAX_PLAN_BYTES = 5 * 1024 * 1024;

export function planTooLarge(bytes: number | null | undefined): boolean {
  return typeof bytes === 'number' && Number.isFinite(bytes) && bytes > MAX_PLAN_BYTES;
}

export type DetectResult =
  | { ok: true; zones: Zone[]; layout?: Layout; aspectRatio?: number }
  | { ok: false; reason: 'NO_ZONES' | 'TIMEOUT' | 'UNAVAILABLE' | 'TOO_LARGE' };

export async function detectZonesFromImage(
  imageBase64: string,
  img: { width: number; height: number },
  call: typeof callVisionModel = callVisionModel,
  mode: VisionMode = 'photo',
): Promise<DetectResult> {
  const format = (process.env.AI_BOX_FORMAT ?? 'pixels') as BoxFormat;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await call(imageBase64, controller.signal, mode);
      if (mode === 'sketch') {
        const plan = normalizeSketch(content, img);
        if (plan) return { ok: true, ...plan };
        continue;
      }
      const raw = parseAiContent(content);
      if (raw) {
        const zones = normalizeZones(raw, format, img);
        if (zones.length > 0) return { ok: true, zones };
      }
    }
    return { ok: false, reason: 'NO_ZONES' };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, reason: 'TIMEOUT' };
    console.error('detectZones', e);
    return { ok: false, reason: 'UNAVAILABLE' };
  } finally {
    clearTimeout(timer);
  }
}
