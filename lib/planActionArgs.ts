import { z } from 'zod';
import { MAX_ZONES } from './ai/normalize';
import type { PlanSource, PlanUpdate } from './layout';
import type { EditableZone } from './zones';

// Forma de los argumentos de las acciones del plano. Llegan del cliente sin tipos: se comprueban
// antes de tocar nada (las reglas de negocio siguen en validateZones / validatePlanUpdate).
export const TOO_MANY_ZONES = `Máximo ${MAX_ZONES} zonas por almacén.`;
export const BAD_PLAN_ARGS = 'Los datos del plano no son válidos.';

const unit = z.number().min(0).max(1); // z.number() ya rechaza NaN e Infinity
const source = z.enum(['sketch', 'photo']);
const path = z.string().max(200);

const editableZoneSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().max(100),
  label: z.string().max(200),
  color: z.string().max(20),
  x: unit,
  y: unit,
  w: unit,
  h: unit,
});

const zonesSchema = z.array(editableZoneSchema).max(MAX_ZONES, { error: TOO_MANY_ZONES });

const planUpdateSchema = z
  .object({
    layout: z.unknown(), // la forma exacta la valida parseStoredLayout (validatePlanUpdate)
    aspectRatio: z.number(),
    image: z.object({ path, source }).optional(),
  })
  .optional();

const pendingSchema = z.object({ path, source }).optional();

export function parseZonesArg(value: unknown): { ok: true; zones: EditableZone[] } | { ok: false; error: string } {
  const r = zonesSchema.safeParse(value);
  if (r.success) return { ok: true, zones: r.data };
  return { ok: false, error: r.error.issues.some((i) => i.message === TOO_MANY_ZONES) ? TOO_MANY_ZONES : BAD_PLAN_ARGS };
}

export function parsePlanUpdateArg(value: unknown): { ok: true; plan: PlanUpdate | undefined } | { ok: false; error: string } {
  const r = planUpdateSchema.safeParse(value);
  if (!r.success) return { ok: false, error: BAD_PLAN_ARGS };
  return { ok: true, plan: r.data as PlanUpdate | undefined };
}

export function parsePendingArg(
  value: unknown,
): { ok: true; pending: { path: string; source: PlanSource } | undefined } | { ok: false } {
  const r = pendingSchema.safeParse(value);
  return r.success ? { ok: true, pending: r.data } : { ok: false };
}
