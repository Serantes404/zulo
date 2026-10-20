import { z } from 'zod';
import { isRealISODate, maxDueDate, todayInMadrid } from './dates';
import { photoGroupOf } from './photoPath';

export const MAX_QUANTITY = 9999;

const uuidSchema = z.string().uuid();
export const isUuid = (v: unknown): v is string => uuidSchema.safeParse(v).success;

export const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY),
  notes: z.string().trim().max(500).optional(),
});

export const DUE_DATE_PAST = 'La fecha de devolución no puede ser anterior a hoy.';
export const DUE_DATE_FAR = 'La fecha de devolución no puede ser dentro de más de un año.';

// "Hoy" se calcula al validar, no al cargar el módulo.
const dueDate = z
  .string()
  .refine(isRealISODate, 'Elige una fecha de devolución válida.')
  .refine((d) => d >= todayInMadrid(), DUE_DATE_PAST)
  .refine((d) => d <= maxDueDate(), DUE_DATE_FAR);

// La forma `<grupo>/loans/<uuid>.jpg`; que el grupo sea el del material lo comprueba la acción.
const loanPhoto = z.string().max(200).refine((p) => photoGroupOf(p, 'loans') !== null);

export const checkoutSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY),
  purpose: z.string().trim().min(1).max(120),
  dueDate,
  photoPath: loanPhoto,
});

export const returnSchema = z.object({
  loanId: z.string().uuid(),
  photoPath: loanPhoto,
  condition: z.enum(['ok', 'damaged', 'incomplete']),
  notes: z.string().trim().max(500).default(''),
});
