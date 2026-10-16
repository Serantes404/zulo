import { z } from 'zod';

export const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(9999),
  notes: z.string().trim().max(500).optional(),
});

export const checkoutSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  purpose: z.string().trim().min(1).max(120),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  photoPath: z.string().min(1),
});

export const returnSchema = z.object({
  loanId: z.string().uuid(),
  photoPath: z.string().min(1),
  condition: z.enum(['ok', 'damaged', 'incomplete']),
  notes: z.string().trim().max(500).default(''),
});
