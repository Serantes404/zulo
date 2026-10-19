const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// true solo para `<groupId>/plans/<uuid>.jpg`, el formato que genera photoPath(groupId, 'plans').
export function isPlanPath(groupId: string, path: string): boolean {
  if (!UUID.test(groupId)) return false;
  const parts = path.split('/');
  if (parts.length !== 3) return false;
  const [g, kind, file] = parts;
  return g === groupId && kind === 'plans' && file.endsWith('.jpg') && UUID.test(file.slice(0, -4));
}
