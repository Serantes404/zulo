import { aiJsonSchema } from './schema';

export const PROMPT = `You are looking at a photo or a hand-drawn sketch of a storage room or shelving unit.
Detect every separate compartment, shelf section or bay that could hold equipment.
For each one return a bounding box [x1, y1, x2, y2] and a short label in Spanish (max 3 words)
if a sign is readable or the contents are clearly recognisable; otherwise use an empty string.
Return only JSON like: {"zones":[{"label":"...","box":[x1,y1,x2,y2]}]}`;

export async function callVisionModel(imageBase64: string, signal?: AbortSignal): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OLLAMA_API_KEY) headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL,
      stream: false,
      format: aiJsonSchema,
      options: { temperature: 0 },
      messages: [{ role: 'user', content: PROMPT, images: [imageBase64] }],
    }),
  });
  if (!res.ok) throw new Error(`OLLAMA_HTTP_${res.status}`);
  const json = (await res.json()) as { message?: { content?: string } };
  return json.message?.content ?? '';
}
