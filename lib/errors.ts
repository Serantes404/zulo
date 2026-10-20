const MESSAGES: Record<string, string> = {
  NOT_ENOUGH_AVAILABLE: 'No quedan suficientes unidades disponibles.',
  ALREADY_RETURNED: 'Este préstamo ya estaba devuelto.',
  FORBIDDEN: 'No tienes permiso para hacer esto.',
  ITEM_HAS_ACTIVE_LOANS: 'No puedes borrar material que está prestado.',
  NOT_AUTHENTICATED: 'Tu sesión ha caducado. Vuelve a entrar.',
  INVALID_INVITE: 'Este link no es válido o ha caducado.',
  NOT_FOUND: 'No se ha encontrado.',
  BAD_PHOTO: 'La foto no es válida. Vuelve a hacerla.',
  QUANTITY_BELOW_LENT: 'No puedes bajar el total por debajo de las unidades prestadas.',
  GROUP_LIMIT: 'Has llegado al máximo de 5 grupos creados.',
  WAREHOUSE_LIMIT: 'Este grupo ya tiene el máximo de 20 almacenes.',
  ITEM_LIMIT: 'Este grupo ya tiene el máximo de 2000 materiales.',
};

export const NO_PERMISSION = MESSAGES.FORBIDDEN;
export const BAD_PHOTO = MESSAGES.BAD_PHOTO;

export function rpcErrorMessage(message: string | undefined, fallback = 'Algo ha fallado. Inténtalo de nuevo.'): string {
  const code = Object.keys(MESSAGES).find((k) => message?.includes(k));
  return code ? MESSAGES[code] : fallback;
}

export function quantityBelowLentMessage(lent: number): string {
  return `No puedes bajar el total por debajo de las unidades prestadas (${lent}).`;
}
