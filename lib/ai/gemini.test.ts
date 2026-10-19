import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callVisionModel, SKETCH_PROMPT } from './gemini';

function geminiResponse(text: string, status = 200) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'clave-test');
  vi.stubEnv('GEMINI_MODEL', 'gemini-test');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('callVisionModel (Gemini)', () => {
  it('envía la foto como JPEG al modelo configurado con la API key en la cabecera', async () => {
    fetchMock.mockResolvedValue(geminiResponse('{"zones":[]}'));
    await callVisionModel('b64');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('clave-test');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts).toContainEqual({ inline_data: { mime_type: 'image/jpeg', data: 'b64' } });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('convierte box_2d [ymin, xmin, ymax, xmax] de Gemini a box [x1, y1, x2, y2]', async () => {
    fetchMock.mockResolvedValue(
      geminiResponse('{"zones":[{"label":"Cuerdas","box_2d":[100,200,300,400]}]}'),
    );
    const content = await callVisionModel('b64');
    expect(JSON.parse(content)).toEqual({ zones: [{ label: 'Cuerdas', box: [200, 100, 400, 300] }] });
  });

  it('devuelve el texto tal cual si no tiene el formato esperado', async () => {
    fetchMock.mockResolvedValue(geminiResponse('basura'));
    expect(await callVisionModel('b64')).toBe('basura');
  });

  it('en modo sketch envía el prompt y el esquema de plano y devuelve el texto sin reordenar', async () => {
    const text = '{"room":{"box_2d":[0,0,1000,1000]},"doors":[],"corridors":[],"zones":[{"label":"","box_2d":[1,2,3,4]}]}';
    fetchMock.mockResolvedValue(geminiResponse(text));
    expect(await callVisionModel('b64', undefined, 'sketch')).toBe(text);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[1].text).toBe(SKETCH_PROMPT);
    expect(body.generationConfig.responseSchema.required).toContain('room');
  });

  it('lanza GEMINI_HTTP_<status> si la respuesta no es ok', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }));
    await expect(callVisionModel('b64')).rejects.toThrow('GEMINI_HTTP_429');
  });
});
