// zones → items es `on delete restrict`: un almacén con material no se puede borrar (Postgres 23503).
// Con RLS, si no eres admin el delete no da error, simplemente no borra filas: por eso se mira cuántas se borraron.
export function deleteWarehouseError(error: { code?: string } | null, deleted: number): string | null {
  if (error?.code === '23503') return 'Este almacén tiene material. Bórralo o muévelo antes de eliminar el almacén.';
  if (error || deleted === 0) return 'No se ha podido eliminar el almacén.';
  return null;
}
