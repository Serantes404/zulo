import { describe, it, expect } from 'vitest';
import { deleteWarehouseError } from './warehouseDelete';

describe('deleteWarehouseError', () => {
  it('null si se ha borrado', () => {
    expect(deleteWarehouseError(null, 1)).toBeNull();
  });

  it('avisa si tiene material (violación de clave foránea 23503)', () => {
    expect(deleteWarehouseError({ code: '23503' }, 0)).toBe(
      'Este almacén tiene material. Bórralo o muévelo antes de eliminar el almacén.',
    );
  });

  it('mensaje genérico ante otros errores', () => {
    expect(deleteWarehouseError({ code: '500' }, 0)).toBe('No se ha podido eliminar el almacén.');
  });

  it('error si no se ha borrado ninguna fila (no existe o no eres admin: RLS no da error)', () => {
    expect(deleteWarehouseError(null, 0)).toBe('No se ha podido eliminar el almacén.');
  });
});
