import { z } from 'zod';
import type { RawZone } from './normalize';

const aiResponseSchema = z.object({
  zones: z.array(
    z.object({
      label: z.string().default(''),
      box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    }),
  ),
});

export function parseAiContent(content: string): RawZone[] | null {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }
  const r = aiResponseSchema.safeParse(data);
  if (!r.success || r.data.zones.length === 0) return null;
  return r.data.zones;
}
