import { uuid } from './uuid';
export type PhotoKind = 'plans' | 'items' | 'loans';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function photoPath(groupId: string, kind: PhotoKind, id: string = uuid()): string {
  return `${groupId}/${kind}/${id}.jpg`;
}

/** Forma `<uuid>/<kind>/<uuid>.jpg` sin mirar el grupo; el grupo lo comprueba isPhotoPath en la acción. */
export function photoGroupOf(path: unknown, kind: PhotoKind): string | null {
  if (typeof path !== 'string') return null;
  const parts = path.split('/');
  if (parts.length !== 3) return null;
  const [g, k, file] = parts;
  if (k !== kind || !UUID.test(g) || !file.endsWith('.jpg') || !UUID.test(file.slice(0, -4))) return null;
  return g;
}

// true solo para `<groupId>/<kind>/<uuid>.jpg`, el formato que genera photoPath(groupId, kind).
// La BD (checkout_item / return_loan) exige lo mismo para las fotos de préstamos.
export function isPhotoPath(path: unknown, groupId: string, kind: PhotoKind): boolean {
  return UUID.test(groupId) && photoGroupOf(path, kind) === groupId;
}
