export const CREATE_GROUP_INPUT_ID = 'crear-nombre';

/**
 * Input del formulario "Crear un grupo nuevo" si /app es la ruta visible.
 * Con cacheComponents, Next oculta las rutas visitadas (Activity, display:none) sin quitarlas del DOM:
 * fuera de /app el input puede existir pero estar oculto.
 */
function visibleInput(): HTMLInputElement | null {
  if (location.pathname !== '/app') return null;
  const input = document.getElementById(CREATE_GROUP_INPUT_ID);
  return input instanceof HTMLInputElement && input.offsetParent !== null ? input : null;
}

/**
 * Lleva al usuario al formulario "Crear un grupo nuevo" de /app y enfoca su campo.
 * Devuelve false si el formulario no está visible (p. ej. venimos de otra página).
 */
export function focusCreateGroup(): boolean {
  const input = visibleInput();
  if (!input) return false;
  const run = () => {
    input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input.focus({ preventScroll: true });
  };
  run();
  // Un menú que se cierra devuelve el foco a su botón: reintenta cuando ha terminado.
  setTimeout(() => {
    if (document.activeElement !== input) run();
  }, 150);
  return true;
}

/** onClick para los enlaces "Crear grupo" (`/app#crear`): si el formulario ya está a la vista, enfoca sin navegar. */
export function onCreateGroupClick(e: { preventDefault: () => void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!visibleInput()) return;
  e.preventDefault();
  history.replaceState(null, '', '/app#crear');
  focusCreateGroup();
}
