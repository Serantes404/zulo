const MESSAGES: Record<string, string> = {
  NOT_ENOUGH_AVAILABLE: 'No quedan suficientes unidades disponibles.',
  ALREADY_RETURNED: 'Este préstamo ya estaba devuelto.',
  FORBIDDEN: 'No tienes permiso para hacer esto.',
  ITEM_HAS_ACTIVE_LOANS: 'No puedes borrar material que está prestado.',
  NOT_AUTHENTICATED: 'Tu sesión ha caducado. Vuelve a entrar.',
  INVALID_INVITE: 'Este link no es válido o ha caducado.',
  NOT_FOUND: 'No se ha encontrado.',
};

export function rpcErrorMessage(message: string | undefined): string {
  const code = Object.keys(MESSAGES).find((k) => message?.includes(k));
  return code ? MESSAGES[code] : 'Algo ha fallado. Inténtalo de nuevo.';
}
