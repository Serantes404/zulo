import { uuid } from './uuid';
export type PhotoKind = 'plans' | 'items' | 'loans';

export function photoPath(groupId: string, kind: PhotoKind, id: string = uuid()): string {
  return `${groupId}/${kind}/${id}.jpg`;
}
