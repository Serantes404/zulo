/**
 * Lleva al usuario al formulario "Crear un grupo nuevo" de la portada y enfoca su campo.
 * Devuelve false si el formulario aún no está en el DOM (p. ej. venimos de otra página).
 */
export function focusCreateGroup(): boolean {
  const input = document.getElementById('name');
  if (!(input instanceof HTMLInputElement)) return false;
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

/** onClick para los enlaces "Crear grupo" (`/#crear`): si el formulario ya está, enfoca sin navegar. */
export function onCreateGroupClick(e: { preventDefault: () => void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!document.getElementById('name')) return;
  e.preventDefault();
  history.replaceState(null, '', '/#crear');
  focusCreateGroup();
}
