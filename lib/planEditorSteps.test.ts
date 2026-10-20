import { describe, it, expect } from 'vitest';
import { EDITOR_STEPS, editorStep, stepState } from './planEditorSteps';

describe('EDITOR_STEPS', () => {
  it('cuatro pasos con texto', () => {
    expect(EDITOR_STEPS.map((s) => s.label)).toEqual(['Dibujar', 'IA', 'Retocar', 'Guardar']);
  });
});

describe('editorStep', () => {
  const base = { sketching: false, detecting: false, saving: false, hasPlan: true };
  it('dibujando o sin plano → dibujar', () => {
    expect(editorStep({ ...base, sketching: true })).toBe('draw');
    expect(editorStep({ ...base, hasPlan: false })).toBe('draw');
  });
  it('la IA tiene prioridad', () => {
    expect(editorStep({ ...base, sketching: true, detecting: true })).toBe('detect');
    expect(editorStep({ ...base, hasPlan: false, detecting: true })).toBe('detect');
  });
  it('con plano → retocar; guardando → guardar', () => {
    expect(editorStep(base)).toBe('refine');
    expect(editorStep({ ...base, saving: true })).toBe('save');
  });
});

describe('stepState', () => {
  it('hecho, actual y pendiente', () => {
    expect(stepState('draw', 'refine')).toBe('done');
    expect(stepState('detect', 'refine')).toBe('done');
    expect(stepState('refine', 'refine')).toBe('current');
    expect(stepState('save', 'refine')).toBe('upcoming');
  });
});
