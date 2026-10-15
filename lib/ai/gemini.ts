// Gemini devuelve las cajas como box_2d = [ymin, xmin, ymax, xmax] en escala 0-1000 (su formato nativo).
// Aquí se reordenan a box = [x1, y1, x2, y2] para el resto de la app (AI_BOX_FORMAT=relative1000).
export const PROMPT = `You are looking at a photo or a hand-drawn sketch of a storage room or shelving unit.
Detect every separate compartment, shelf section or bay that could hold equipment.
For each one return its box_2d and a short label in Spanish (max 3 words)
if a sign is readable or the contents are clearly recognisable; otherwise use an empty string.`;

const responseSchema = {
  type: 'OBJECT',
  properties: {
    zones: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          box_2d: { type: 'ARRAY', items: { type: 'NUMBER' } },
        },
        required: ['label', 'box_2d'],
      },
    },
  },
  required: ['zones'],
};

type GeminiZone = { label?: string; box_2d?: number[] };

function toAppFormat(text: string): string {
  try {
    const data = JSON.parse(text) as { zones?: GeminiZone[] };
    if (!Array.isArray(data.zones)) return text;
    const zones = data.zones.map((z) => {
      const [ymin, xmin, ymax, xmax] = z.box_2d ?? [];
      return { label: z.label, box: [xmin, ymin, xmax, ymax] };
    });
    return JSON.stringify({ zones });
  } catch {
    return text;
  }
}

export async function callVisionModel(imageBase64: string, signal?: AbortSignal): Promise<string> {
  const model = process.env.GEMINI_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
    signal,
    body: JSON.stringify({
      contents: [
        { parts: [{ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, { text: PROMPT }] },
      ],
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`GEMINI_HTTP_${res.status}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return toAppFormat(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}
