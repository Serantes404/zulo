import { z } from 'zod';

// Estructura de la sala de un plano dibujado. Coordenadas en 0-1 relativas a la sala (no a la imagen).
export type Wall = 'top' | 'bottom' | 'left' | 'right';
export type PlanSource = 'sketch' | 'photo';
export type Door = { wall: Wall; start: number; end: number };
export type Corridor = { label: string; x: number; y: number; w: number; h: number };
export type Layout = { doors: Door[]; corridors: Corridor[] };

export const WALLS: readonly Wall[] = ['top', 'bottom', 'left', 'right'];
export const DEFAULT_LAYOUT: Layout = { doors: [], corridors: [] };
export const MIN_ASPECT = 0.25;
export const MAX_ASPECT = 4;

const unit = z.number().min(0).max(1);
const layoutSchema = z.object({
  doors: z
    .array(
      z
        .object({ wall: z.enum(WALLS), start: unit, end: unit })
        .refine((d) => d.end > d.start),
    )
    .max(8),
  corridors: z.array(z.object({ label: z.string().max(40), x: unit, y: unit, w: unit, h: unit })).max(6),
});

export function parseStoredLayout(value: unknown): Layout | null {
  const r = layoutSchema.safeParse(value);
  return r.success ? r.data : null;
}

export function validatePlan(plan: { layout: unknown; aspectRatio: number }): string | null {
  const okAspect =
    Number.isFinite(plan.aspectRatio) && plan.aspectRatio >= MIN_ASPECT && plan.aspectRatio <= MAX_ASPECT;
  if (!parseStoredLayout(plan.layout) || !okAspect) return 'El plano no es válido.';
  return null;
}

export type PlanUpdate = {
  layout: Layout | null;
  aspectRatio: number;
  image?: { path: string; source: PlanSource };
};

// Valida lo que saveZones va a escribir en el almacén. La comprobación de la ruta de la imagen se hace en la acción.
export function validatePlanUpdate(plan: PlanUpdate): string | null {
  const bad = 'El plano no es válido.';
  const { image } = plan;
  if (image && image.source !== 'sketch' && image.source !== 'photo') return bad;
  if (plan.layout !== null) return validatePlan({ layout: plan.layout, aspectRatio: plan.aspectRatio });
  if (!image || image.source !== 'photo') return bad;
  if (!Number.isFinite(plan.aspectRatio) || plan.aspectRatio <= 0) return bad;
  return null;
}
