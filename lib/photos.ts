import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { photoPath, type PhotoKind } from '@/lib/photoPath';

export async function uploadPhoto(file: File, groupId: string, kind: PhotoKind): Promise<string> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    initialQuality: 0.8,
    fileType: 'image/jpeg',
    useWebWorker: true,
  });
  const path = photoPath(groupId, kind);
  const { error } = await createClient()
    .storage.from('photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function imageAspect(file: File): Promise<number> {
  const bmp = await createImageBitmap(file);
  const ratio = bmp.width / bmp.height;
  bmp.close();
  return ratio;
}
