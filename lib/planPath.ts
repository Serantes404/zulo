import { isPhotoPath } from './photoPath';

// true solo para `<groupId>/plans/<uuid>.jpg`, el formato que genera photoPath(groupId, 'plans').
export function isPlanPath(groupId: string, path: string): boolean {
  return isPhotoPath(path, groupId, 'plans');
}
