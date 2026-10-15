// Chrome y Firefox no saben abrir HEIC (el formato de las fotos de iPhone), así que fallarían
// la compresión y createImageBitmap. Se convierte a JPEG antes; la librería solo se descarga si hace falta.
type Converter = (file: File) => Promise<Blob>;

const heicToJpeg: Converter = async (file) => {
  const { heicTo } = await import('heic-to/next');
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
};

export function looksLikeHeic(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export async function toBrowserImage(file: File, convert: Converter = heicToJpeg): Promise<File> {
  if (!looksLikeHeic(file)) return file;
  const jpeg = await convert(file);
  return new File([jpeg], file.name.replace(/\.hei[cf]$/i, '') + '.jpg', { type: 'image/jpeg' });
}
