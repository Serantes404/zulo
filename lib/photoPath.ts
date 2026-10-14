export type PhotoKind = 'plans' | 'items' | 'loans';

export function photoPath(groupId: string, kind: PhotoKind, id: string = crypto.randomUUID()): string {
  return `${groupId}/${kind}/${id}.jpg`;
}
