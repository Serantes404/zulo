/** Nombre de almacén desde un formulario: recortado y de máximo 80 caracteres. */
export function parseWarehouseName(formData: FormData): string {
  return String(formData.get('name') ?? '').trim().slice(0, 80);
}
