export type TabKey = 'almacenes' | 'buscar' | 'prestamos' | 'grupo';

/** Id del almacén si la ruta es /g/[groupId]/w/[whId]… */
function warehousePath(groupId: string, pathname: string): string | null {
  const prefix = `/g/${groupId}/w/`;
  if (!pathname.startsWith(prefix)) return null;
  const whId = pathname.slice(prefix.length).split('/')[0];
  return whId ? `${prefix}${whId}` : null;
}

export function tabHref(key: TabKey, groupId: string, pathname: string): string {
  const base = `/g/${groupId}`;
  switch (key) {
    case 'almacenes':
      return base;
    case 'buscar': {
      const wh = warehousePath(groupId, pathname);
      return wh ? `${wh}#buscar` : base;
    }
    case 'prestamos':
      return `${base}/prestamos`;
    case 'grupo':
      return `${base}#miembros`;
  }
}

/** El hash no llega al servidor ni a usePathname: Buscar y Grupo nunca se marcan. */
export function isTabActive(key: TabKey, groupId: string, pathname: string): boolean {
  const base = `/g/${groupId}`;
  if (key === 'almacenes') return pathname === base || pathname.startsWith(`${base}/w/`);
  if (key === 'prestamos') return pathname === `${base}/prestamos` || pathname.startsWith(`${base}/prestamos/`);
  return false;
}

/** El editor del plano tiene su propia barra de acción fija abajo: ahí no se pinta la barra inferior. */
export function hidesBottomNav(groupId: string, pathname: string): boolean {
  const wh = warehousePath(groupId, pathname);
  return wh !== null && /^\/edit\/?$/.test(pathname.slice(wh.length));
}

export function initials(fullName: string | null | undefined, email: string | null | undefined): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  const e = (email ?? '').trim();
  return e ? e[0].toUpperCase() : '?';
}
