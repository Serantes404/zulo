// Gemini devuelve las cajas como box_2d = [ymin, xmin, ymax, xmax] en escala 0-1000 (su formato nativo).
// Aquí se reordenan a box = [x1, y1, x2, y2] para el resto de la app (AI_BOX_FORMAT=relative1000).
export const PROMPT = `You are looking at a photo or a hand-drawn sketch of a storage room or shelving unit.
Detect every separate compartment, shelf section or bay that could hold equipment.
If it is a top-down sketch (black lines on white), each enclosed area or drawn rectangle against the walls is one zone; ignore the outer walls and empty floor. In a sketch, use an empty label unless a name is written inside the zone.
For each one return its box_2d and a short label in Spanish (max 3 words)
if a sign is readable or the contents are clearly recognisable; otherwise use an empty string.`;

export type VisionMode = 'photo' | 'sketch';

export const SKETCH_PROMPT = `This is a hand-drawn TOP-DOWN sketch of a storage room. Turn it into a clean floor plan.
All boxes are box_2d = [ymin, xmin, ymax, xmax] on a 0-1000 scale of the image.
- room: the box of the room's inner walls. If no outer walls are drawn, use the drawing area.
- doors: each door or entrance: the wall it is on ("top","bottom","left","right") and its start/end along that wall on the 0-1000 image scale (y for left/right walls, x for top/bottom walls). A gap in a wall, a mark on a wall or a word like "Puerta"/"Entrada" means a door.
- corridors: free walking areas actually drawn or labelled (e.g. "Pasillo"), as box_2d. Do not invent corridors.
- zones: every storage area, as box_2d, with the name written inside it (empty string if none). Zones sit against the walls and must not overlap.
Doors and corridors are NOT zones: an area labelled "Puerta", "Entrada" or "Door" is a DOOR on the wall it touches, never a zone.`;

const box2d = { type: 'ARRAY', items: { type: 'NUMBER' } };
const sketchSchema = {
  type: 'OBJECT',
  properties: {
    room: { type: 'OBJECT', properties: { box_2d: box2d }, required: ['box_2d'] },
    doors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { wall: { type: 'STRING' }, start: { type: 'NUMBER' }, end: { type: 'NUMBER' } },
        required: ['wall', 'start', 'end'],
      },
    },
    corridors: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, box_2d: box2d }, required: ['label', 'box_2d'] },
    },
    zones: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, box_2d: box2d }, required: ['label', 'box_2d'] },
    },
  },
  required: ['room', 'doors', 'corridors', 'zones'],
};

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

export async function callVisionModel(
  imageBase64: string,
  signal?: AbortSignal,
  mode: VisionMode = 'photo',
): Promise<string> {
  const model = process.env.GEMINI_MODEL;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
    signal,
    body: JSON.stringify({
      contents: [
        { parts: [{ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, { text: mode === 'sketch' ? SKETCH_PROMPT : PROMPT }] },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: mode === 'sketch' ? sketchSchema : responseSchema,
        temperature: 0,
      },
    }),
  });
  if (!res.ok) throw new Error(`GEMINI_HTTP_${res.status}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return mode === 'sketch' ? text : toAppFormat(text);
}
