// Pasos del editor del plano: 1 Dibujar → 2 IA → 3 Retocar → 4 Guardar.
export type EditorStep = 'draw' | 'detect' | 'refine' | 'save';

export const EDITOR_STEPS: readonly { id: EditorStep; label: string }[] = [
  { id: 'draw', label: 'Dibujar' },
  { id: 'detect', label: 'IA' },
  { id: 'refine', label: 'Retocar' },
  { id: 'save', label: 'Guardar' },
];

export function editorStep(s: { sketching: boolean; detecting: boolean; saving: boolean; hasPlan: boolean }): EditorStep {
  if (s.detecting) return 'detect';
  if (s.sketching || !s.hasPlan) return 'draw';
  return s.saving ? 'save' : 'refine';
}

const index = (step: EditorStep) => EDITOR_STEPS.findIndex((s) => s.id === step);

export function stepState(step: EditorStep, current: EditorStep): 'done' | 'current' | 'upcoming' {
  const d = index(step) - index(current);
  return d < 0 ? 'done' : d === 0 ? 'current' : 'upcoming';
}
