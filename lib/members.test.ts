import { describe, it, expect } from 'vitest';
import { canRemoveMember, countLoansByUser } from './members';

describe('canRemoveMember', () => {
  const admin = { id: 'a', role: 'admin' as const };
  it('un admin puede echar a un miembro', () => {
    expect(canRemoveMember(admin, { id: 'm', role: 'member' })).toBe(true);
  });
  it('un admin puede echar a otro admin', () => {
    expect(canRemoveMember(admin, { id: 'b', role: 'admin' })).toBe(true);
  });
  it('no puede echarse a sí mismo', () => {
    expect(canRemoveMember(admin, { id: 'a', role: 'member' })).toBe(false);
    expect(canRemoveMember(admin, { id: 'a', role: 'admin' })).toBe(false);
  });
  it('un miembro no puede echar a nadie', () => {
    expect(canRemoveMember({ id: 'm', role: 'member' }, { id: 'n', role: 'member' })).toBe(false);
  });
});

describe('countLoansByUser', () => {
  it('cuenta préstamos por usuario', () => {
    expect(countLoansByUser([{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'a' }])).toEqual({ a: 2, b: 1 });
  });
  it('sin filas devuelve objeto vacío', () => {
    expect(countLoansByUser(null)).toEqual({});
  });
});
