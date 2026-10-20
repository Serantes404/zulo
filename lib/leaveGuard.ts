type LinkInfo = { href: string; target?: string | null; download?: boolean };
type ClickInfo = { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented?: boolean };
type Loc = { origin: string; pathname: string; search: string };

/**
 * ¿Este clic en un enlace sacaría al usuario de la página actual dentro de la app?
 * Falso para clics con modificadores (nueva pestaña), target externo, descargas, otro origen,
 * enlaces mailto/tel y saltos de hash dentro de la misma página.
 */
export function isLeavingNavigation(link: LinkInfo, click: ClickInfo, loc: Loc): boolean {
  if (click.defaultPrevented || click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (link.download) return false;
  if (link.target && link.target !== '_self') return false;
  let url: URL;
  try {
    url = new URL(link.href, loc.origin + loc.pathname + loc.search);
  } catch {
    return false;
  }
  if (url.origin !== loc.origin) return false;
  return url.pathname !== loc.pathname || url.search !== loc.search;
}
