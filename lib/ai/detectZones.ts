import { callVisionModel } from './gemini';
import { normalizeZones, type BoxFormat, type Zone } from './normalize';
import { parseAiContent } from './schema';

export const AI_TIMEOUT_MS = 55_000;

export type DetectResult =
  | { ok: true; zones: Zone[] }
  | { ok: false; reason: 'NO_ZONES' | 'TIMEOUT' | 'UNAVAILABLE' };

export async function detectZonesFromImage(
  imageBase64: string,
  img: { width: number; height: number },
  call: typeof callVisionModel = callVisionModel,
): Promise<DetectResult> {
  const format = (process.env.AI_BOX_FORMAT ?? 'pixels') as BoxFormat;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await call(imageBase64, controller.signal);
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
