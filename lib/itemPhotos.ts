import type { ItemWithAvail } from './availability';

export type ItemWithPhoto = ItemWithAvail & { photoUrl: string | null };

/** Rutas de foto distintas y no vacías, para firmarlas todas en una sola llamada. */
export function photoPaths(items: { photo_path: string | null }[]): string[] {
  return [...new Set(items.flatMap((i) => (i.photo_path ? [i.photo_path] : [])))];
}

/** Añade `photoUrl` a cada material; sin foto o sin URL firmada queda en null. */
export function attachPhotoUrls<T extends { photo_path: string | null }>(
  items: T[],
  urls: Record<string, string>,
): (T & { photoUrl: string | null })[] {
  return items.map((i) => ({ ...i, photoUrl: i.photo_path ? urls[i.photo_path] ?? null : null }));
}
