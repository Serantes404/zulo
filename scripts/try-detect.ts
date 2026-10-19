import { readFileSync } from 'node:fs';
import { imageSize } from 'image-size';
import { detectZonesFromImage } from '../lib/ai/detectZones';

async function main() {
  const [file, mode = 'photo'] = process.argv.slice(2);
  if (!file) {
    console.error('Uso: npx tsx --env-file=.env.local scripts/try-detect.ts <foto.jpg> [photo|sketch]');
    process.exit(1);
  }
  const buf = readFileSync(file);
  const { width, height } = imageSize(buf);
  if (!width || !height) throw new Error('No se pudo leer el tamaño de la imagen');
  console.time('IA');
  const r = await detectZonesFromImage(buf.toString('base64'), { width, height }, undefined, mode === 'sketch' ? 'sketch' : 'photo');
  console.timeEnd('IA');
  console.log(JSON.stringify(r, null, 2));
}

main();
