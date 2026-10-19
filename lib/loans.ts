export type ReturnCondition = 'ok' | 'damaged' | 'incomplete';

export const CONDITION_LABEL: Record<ReturnCondition, string> = {
  ok: 'Bien',
  damaged: 'Dañado',
  incomplete: 'Incompleto',
};

export const conditionLabel = (c: string | null): string =>
  c && c in CONDITION_LABEL ? CONDITION_LABEL[c as ReturnCondition] : '—';
