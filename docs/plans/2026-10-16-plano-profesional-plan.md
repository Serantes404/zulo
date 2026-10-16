# Plano profesional generado por IA: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** cuando el plano viene de un dibujo o boceto en planta, la app guarda y enseña un plano limpio tipo arquitecto (muros rayados, puerta con arco, pasillo y zonas), no el dibujo a mano.

**Arquitectura:**
- En modo `sketch`, Gemini devuelve la estructura de la sala: `room`, `doors`, `corridors` y `zones` en `box_2d` 0-1000.
- Un postproceso puro (`lib/ai/layout.ts`) lo pasa a coordenadas 0-1 relativas a la sala y lo limpia.
- La estructura se guarda en `warehouses.layout` (jsonb) y la dibuja un SVG (`components/FloorPlan.tsx`) debajo de las zonas, tanto en el editor como en la vista del almacén.
- Las fotos (`plan_source = 'photo'`) siguen como ahora.

**Tech stack:** Next 16 (App Router, `cacheComponents`), Supabase (Postgres + RLS), Gemini REST (`gemini-3.5-flash-lite`), zod 4, Vitest, react-rnd.

**Spec:** `docs/specs/2026-10-15-plano-profesional-design.md`

## Restricciones globales

- UI en español, mobile-first, con `<label>` en todos los inputs.
- Nunca se usa la service role key en la app. `GEMINI_API_KEY` solo en el servidor.
- **No usar `npm install <paquete>`** (npm 11.6 rompe el lockfile). Este plan no añade dependencias.
- Antes de cada commit: `npm test && npm run build`.
- Next 16: las páginas leen `params` y la sesión dentro de `<Suspense>`. Consulta `node_modules/next/dist/docs/` antes de usar APIs de Next.
- En el cliente, los ids se generan con `uuid()` de `lib/uuid.ts`, nunca con `crypto.randomUUID()`.
- Coordenadas del layout: 0-1 relativas a la sala. Las zonas de planos `sketch` también son relativas a la sala.
- `aspect_ratio` de planos `sketch` = proporción de la sala, limitada a 0.25-4.
- Fuera de alcance (v1): editar muros o puertas a mano, salas no rectangulares, metros, plano como imagen generada.

## Review Focus

1. **Redibujar un plano cuyas zonas tienen material:** al guardar debe salir "Mueve o borra el material de «X»…" y no perderse nada. Es la lógica actual de `saveZones`; se comprueba a mano en la Tarea 5, paso 8.
2. **La IA devuelve una sala vacía, invertida o diminuta:** se usa la imagen entera como sala. Test en la Tarea 3.
3. **Puertas con inicio > fin, fuera de la sala o demasiado estrechas o anchas:** se normalizan a un ancho del 6-40 % dentro de la pared. Test en la Tarea 3.
4. **`layout` guardado corrupto o de otra versión:** la página no rompe y pinta una sala vacía. Test de `parseStoredLayout` en la Tarea 1, y `?? DEFAULT_LAYOUT` en las Tareas 5 y 6.
5. **Sala muy alargada** (p. ej. un pasillo de 10:1): la proporción se limita a 0.25-4. Test en la Tarea 3.

---

### Tarea 1: datos del layout (migración, tipos y validación)

**Archivos:**
- Crear: `supabase/migrations/20261016090000_warehouse_layout.sql`, `lib/layout.ts`
- Modificar: `lib/database.types.ts` (bloque `warehouses`, líneas ~239-270)
- Test: `lib/layout.test.ts`

**Interfaces:**
- Produce:
  - `type Wall = 'top' | 'bottom' | 'left' | 'right'`, `type PlanSource = 'sketch' | 'photo'`
  - `type Door = { wall: Wall; start: number; end: number }`
  - `type Corridor = { label: string; x: number; y: number; w: number; h: number }`
  - `type Layout = { doors: Door[]; corridors: Corridor[] }`
  - `WALLS`, `DEFAULT_LAYOUT`, `MIN_ASPECT = 0.25`, `MAX_ASPECT = 4`
  - `parseStoredLayout(value: unknown): Layout | null`
  - `validatePlan(plan: { layout: unknown; aspectRatio: number }): string | null`

- [ ] **Paso 1: escribir el test.** `lib/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseStoredLayout, validatePlan, DEFAULT_LAYOUT } from './layout';

const ok = {
  doors: [{ wall: 'left', start: 0.8, end: 0.86 }],
  corridors: [{ label: 'Pasillo', x: 0.3, y: 0, w: 0.4, h: 1 }],
};

describe('parseStoredLayout', () => {
  it('acepta un layout válido', () => expect(parseStoredLayout(ok)).toEqual(ok));
  it('acepta el layout vacío', () => expect(parseStoredLayout(DEFAULT_LAYOUT)).toEqual(DEFAULT_LAYOUT));
  it('null si no es un objeto', () => {
    expect(parseStoredLayout(null)).toBeNull();
    expect(parseStoredLayout('x')).toBeNull();
  });
  it('null si una puerta tiene una pared desconocida', () =>
    expect(parseStoredLayout({ ...ok, doors: [{ wall: 'techo', start: 0.1, end: 0.2 }] })).toBeNull());
  it('null si una puerta acaba antes de empezar', () =>
    expect(parseStoredLayout({ ...ok, doors: [{ wall: 'top', start: 0.5, end: 0.4 }] })).toBeNull());
  it('null si hay coordenadas fuera de 0-1', () =>
    expect(parseStoredLayout({ ...ok, corridors: [{ label: 'P', x: 1.5, y: 0, w: 0.1, h: 1 }] })).toBeNull());
});

describe('validatePlan', () => {
  it('null si es válido', () => expect(validatePlan({ layout: ok, aspectRatio: 0.8 })).toBeNull());
  it('rechaza un layout inválido', () =>
    expect(validatePlan({ layout: { doors: 'x' }, aspectRatio: 1 })).toBe('El plano no es válido.'));
  it('rechaza proporciones fuera de 0.25-4 o no finitas', () => {
    expect(validatePlan({ layout: ok, aspectRatio: 5 })).toBe('El plano no es válido.');
    expect(validatePlan({ layout: ok, aspectRatio: Number.NaN })).toBe('El plano no es válido.');
  });
});
```

- [ ] **Paso 2: comprobar que falla.** `npx vitest run lib/layout.test.ts`. Esperado: FAIL, "Cannot find module './layout'".

- [ ] **Paso 3: implementar.** `lib/layout.ts`:

```ts
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
        .object({ wall: z.enum(['top', 'bottom', 'left', 'right']), start: unit, end: unit })
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
```

- [ ] **Paso 4: comprobar que pasa.** `npx vitest run lib/layout.test.ts`. Esperado: PASS (9 tests).

- [ ] **Paso 5: migración.** `supabase/migrations/20261016090000_warehouse_layout.sql`:

```sql
-- Plano profesional: de dónde sale el plano y estructura de la sala (puertas y pasillos),
-- en 0-1 relativo a la sala. La política wh_update (solo admins) ya cubre estas columnas.
alter table public.warehouses
  add column plan_source text check (plan_source in ('sketch', 'photo')),
  add column layout jsonb;
```

- [ ] **Paso 6: tipos.** En `lib/database.types.ts`, dentro de `warehouses`:
  - en `Row`, añade `layout: Json | null` (después de `id: string`) y `plan_source: string | null` (después de `plan_image_path`);
  - en `Insert` y `Update`, añade `layout?: Json | null` y `plan_source?: string | null` en las mismas posiciones.

  `Json` ya está definido al principio del archivo. Si el proyecto está enlazado (`supabase link`), puedes ejecutar `npm run types` después del paso 7 en lugar de editar a mano.

- [ ] **Paso 7: aplicar la migración (Santi).** En Supabase, abre *SQL Editor*, pega el contenido del archivo del paso 5 y pulsa *Run*. Esperado: "Success. No rows returned".

  Comprueba con `select plan_source, layout from warehouses limit 1;` (esperado: dos columnas `null`). **Sin este paso, las Tareas 5 y 6 fallan al leer las columnas nuevas.**

- [ ] **Paso 8: commit.** `npm test && npm run build` (esperado: PASS y sin errores).

```bash
git add supabase/migrations/20261016090000_warehouse_layout.sql lib/layout.ts lib/layout.test.ts lib/database.types.ts
git commit -m "feat(plan): columnas plan_source y layout, y validación del layout"
```

---

### Tarea 2: dibujo del plano (geometría y SVG)

**Archivos:**
- Crear: `lib/floorPlanGeometry.ts`, `components/FloorPlan.tsx`
- Test: `lib/floorPlanGeometry.test.ts`

**Interfaces:**
- Consume: `Door`, `Wall`, `Layout`, `WALLS` (Tarea 1).
- Produce:
  - `wallSegments(wall: Wall, doors: Door[]): Array<[number, number]>`: tramos macizos (0-1 a lo largo de la pared).
  - `doorSwing(door: Door, W: number, H: number): { hinge: Pt; leafEnd: Pt; arcEnd: Pt; radius: number; sweep: 0 | 1 }`
  - `<FloorPlan aspectRatio={number} layout={Layout} className?={string} />`: SVG a tamaño completo de su contenedor.

- [ ] **Paso 1: escribir el test.** `lib/floorPlanGeometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { wallSegments, doorSwing } from './floorPlanGeometry';
import type { Door } from './layout';

describe('wallSegments', () => {
  it('sin puertas, la pared es entera', () => expect(wallSegments('left', [])).toEqual([[0, 1]]));
  it('deja un hueco donde está la puerta', () =>
    expect(wallSegments('left', [{ wall: 'left', start: 0.4, end: 0.5 }])).toEqual([[0, 0.4], [0.5, 1]]));
  it('ignora las puertas de otras paredes', () =>
    expect(wallSegments('top', [{ wall: 'left', start: 0.4, end: 0.5 }])).toEqual([[0, 1]]));
  it('une puertas que se solapan y no crea tramos vacíos en los extremos', () =>
    expect(
      wallSegments('bottom', [
        { wall: 'bottom', start: 0, end: 0.2 },
        { wall: 'bottom', start: 0.15, end: 0.3 },
        { wall: 'bottom', start: 0.9, end: 1 },
      ]),
    ).toEqual([[0.3, 0.9]]));
});

describe('doorSwing', () => {
  const W = 1000;
  const H = 500;
  it('puerta en la pared izquierda: pivota en start y abre hacia dentro', () => {
    const d: Door = { wall: 'left', start: 0.2, end: 0.4 };
    expect(doorSwing(d, W, H)).toEqual({
      hinge: { x: 0, y: 100 },
      leafEnd: { x: 100, y: 100 },
      arcEnd: { x: 0, y: 200 },
      radius: 100,
      sweep: 1,
    });
  });
  it('puerta en la pared inferior', () => {
    const d: Door = { wall: 'bottom', start: 0.5, end: 0.75 };
    expect(doorSwing(d, W, H)).toEqual({
      hinge: { x: 500, y: 500 },
      leafEnd: { x: 500, y: 250 },
      arcEnd: { x: 750, y: 500 },
      radius: 250,
      sweep: 1,
    });
  });
  it('las puertas de arriba y de la derecha giran en sentido contrario', () => {
    expect(doorSwing({ wall: 'top', start: 0.1, end: 0.2 }, W, H).sweep).toBe(0);
    expect(doorSwing({ wall: 'right', start: 0.1, end: 0.2 }, W, H).sweep).toBe(0);
  });
});
```

- [ ] **Paso 2: comprobar que falla.** `npx vitest run lib/floorPlanGeometry.test.ts`. Esperado: FAIL, "Cannot find module".

- [ ] **Paso 3: implementar.** `lib/floorPlanGeometry.ts`:

```ts
import type { Door, Wall } from './layout';

export type Pt = { x: number; y: number };

/** Tramos macizos de una pared (0-1 a lo largo de ella) que quedan entre sus puertas. */
export function wallSegments(wall: Wall, doors: Door[]): Array<[number, number]> {
  const gaps = doors
    .filter((d) => d.wall === wall)
    .map((d) => [d.start, d.end] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  let cur = 0;
  for (const [s, e] of gaps) {
    if (s > cur) out.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < 1) out.push([cur, 1]);
  return out;
}

/**
 * Hoja y arco de una puerta en coordenadas del viewBox (W × H). Pivota en `start` y abre hacia dentro.
 * `sweep` es el sweep-flag del arco SVG: 1 = el ángulo crece (sentido horario en pantalla).
 */
export function doorSwing(door: Door, W: number, H: number) {
  const along = door.wall === 'top' || door.wall === 'bottom' ? W : H;
  const radius = (door.end - door.start) * along;
  const s = door.start;
  const e = door.end;
  switch (door.wall) {
    case 'top':
      return { hinge: { x: s * W, y: 0 }, leafEnd: { x: s * W, y: radius }, arcEnd: { x: e * W, y: 0 }, radius, sweep: 0 as const };
    case 'bottom':
      return { hinge: { x: s * W, y: H }, leafEnd: { x: s * W, y: H - radius }, arcEnd: { x: e * W, y: H }, radius, sweep: 1 as const };
    case 'left':
      return { hinge: { x: 0, y: s * H }, leafEnd: { x: radius, y: s * H }, arcEnd: { x: 0, y: e * H }, radius, sweep: 1 as const };
    case 'right':
      return { hinge: { x: W, y: s * H }, leafEnd: { x: W - radius, y: s * H }, arcEnd: { x: W, y: e * H }, radius, sweep: 0 as const };
  }
}
```

- [ ] **Paso 4: comprobar que pasa.** `npx vitest run lib/floorPlanGeometry.test.ts`. Esperado: PASS (7 tests).

- [ ] **Paso 5: componente.** `components/FloorPlan.tsx`:

```tsx
'use client';
import { useId } from 'react';
import { doorSwing, wallSegments } from '@/lib/floorPlanGeometry';
import { WALLS, type Layout, type Wall } from '@/lib/layout';

// Plano tipo arquitecto. viewBox de 1000 de ancho; el contenedor tiene la misma proporción, así que encaja exacto.
const W = 1000;
const T = 16; // grosor del muro en unidades del viewBox

type Props = { aspectRatio: number; layout: Layout; className?: string };

export function FloorPlan({ aspectRatio, layout, className }: Props) {
  const H = Math.round(W / aspectRatio);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ''); // ids únicos para los <pattern>
  const wallRect = (wall: Wall, [a, b]: [number, number]) => {
    switch (wall) {
      case 'top':
        return { x: a * W, y: 0, width: (b - a) * W, height: T };
      case 'bottom':
        return { x: a * W, y: H - T, width: (b - a) * W, height: T };
      case 'left':
        return { x: 0, y: a * H, width: T, height: (b - a) * H };
      case 'right':
        return { x: W - T, y: a * H, width: T, height: (b - a) * H };
    }
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`tile-${id}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#FAFAF7" />
          <path d="M40 0H0V40" fill="none" stroke="#ECEAE4" strokeWidth="1.5" />
        </pattern>
        <pattern id={`hatch-${id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#fff" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#2B2B2B" strokeWidth="4" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#tile-${id})`} />

      {layout.corridors.map((c, i) => {
        const cx = (c.x + c.w / 2) * W;
        const cy = (c.y + c.h / 2) * H;
        const vertical = c.h * H > c.w * W;
        return (
          <g key={`c${i}`}>
            <rect x={c.x * W} y={c.y * H} width={c.w * W} height={c.h * H} fill="none" stroke="#B8B4AA" strokeWidth="2" strokeDasharray="10 10" />
            <text
              x={cx}
              y={cy}
              fontSize="22"
              letterSpacing="8"
              fill="#9A968C"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Helvetica, Arial, sans-serif"
              transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
            >
              {(c.label || 'Pasillo').toUpperCase()}
            </text>
          </g>
        );
      })}

      {WALLS.flatMap((wall) =>
        wallSegments(wall, layout.doors).map((seg, i) => (
          <rect key={`${wall}${i}`} {...wallRect(wall, seg)} fill={`url(#hatch-${id})`} stroke="#2B2B2B" strokeWidth="2" />
        )),
      )}

      {layout.doors.map((d, i) => {
        const s = doorSwing(d, W, H);
        return (
          <g key={`d${i}`}>
            <line x1={s.hinge.x} y1={s.hinge.y} x2={s.leafEnd.x} y2={s.leafEnd.y} stroke="#2B2B2B" strokeWidth="4" />
            <path
              d={`M ${s.leafEnd.x} ${s.leafEnd.y} A ${s.radius} ${s.radius} 0 0 ${s.sweep} ${s.arcEnd.x} ${s.arcEnd.y}`}
              fill="none"
              stroke="#2B2B2B"
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Paso 6: comprobar tipos y lint.** `npx tsc --noEmit && npx eslint components/FloorPlan.tsx lib/floorPlanGeometry.ts`. Esperado: sin errores.

- [ ] **Paso 7: commit.** `npm test && npm run build`.

```bash
git add lib/floorPlanGeometry.ts lib/floorPlanGeometry.test.ts components/FloorPlan.tsx
git commit -m "feat(plan): componente FloorPlan con muros, puertas y pasillos"
```

---

### Tarea 3: postproceso de la respuesta en modo sketch

**Archivos:**
- Crear: `lib/ai/layout.ts`
- Test: `lib/ai/layout.test.ts`

**Interfaces:**
- Consume: `normalizeZones`, `type Zone` (`lib/ai/normalize.ts`); `Layout`, `Door`, `Corridor`, `Wall`, `MIN_ASPECT`, `MAX_ASPECT` (Tarea 1).
- Produce:
  - `type SketchPlan = { zones: Zone[]; layout: Layout; aspectRatio: number }`
  - `normalizeSketch(content: string, img: { width: number; height: number }): SketchPlan | null`
  - `MIN_DOOR = 0.06`, `MAX_DOOR = 0.4`, `MAX_CORRIDOR_OVERLAP = 0.2`

  Formato de entrada (lo que devuelve Gemini en la Tarea 4): `{ room: { box_2d }, doors: [{ wall, start, end }], corridors: [{ label, box_2d }], zones: [{ label, box_2d }] }`.
  - `box_2d = [ymin, xmin, ymax, xmax]` en 0-1000 sobre la imagen.
  - `start`/`end` de las puertas, en 0-1000 sobre la imagen: `y` para las paredes left/right y `x` para top/bottom.

- [ ] **Paso 1: escribir el test.** `lib/ai/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeSketch } from './layout';

const img = { width: 1000, height: 1000 };
const full = { box_2d: [0, 0, 1000, 1000] };
const json = (o: object) => JSON.stringify({ room: full, doors: [], corridors: [], zones: [], ...o });

describe('normalizeSketch', () => {
  it('convierte las zonas a coordenadas de la sala', () => {
    const r = normalizeSketch(
      json({ room: { box_2d: [100, 200, 900, 800] }, zones: [{ label: 'Menaje', box_2d: [100, 200, 500, 500] }] }),
      img,
    )!;
    expect(r.zones[0].label).toBe('Menaje');
    expect(r.zones[0].x).toBeCloseTo(0);
    expect(r.zones[0].y).toBeCloseTo(0);
    expect(r.zones[0].w).toBeCloseTo(0.5);
    expect(r.zones[0].h).toBeCloseTo(0.5);
    expect(r.aspectRatio).toBeCloseTo(600 / 800);
  });

  it('usa la imagen entera si la sala no es válida o es diminuta', () => {
    for (const room of [undefined, { box_2d: [500, 500, 510, 510] }, { box_2d: 'x' }]) {
      const r = normalizeSketch(json({ room, zones: [{ label: 'A', box_2d: [0, 0, 500, 500] }] }), img)!;
      expect(r.zones[0].w).toBeCloseTo(0.5);
      expect(r.aspectRatio).toBeCloseTo(1);
    }
  });

  it('convierte una zona "Puerta" en puerta de la pared más cercana', () => {
    const r = normalizeSketch(
      json({ zones: [{ label: 'Menaje', box_2d: [0, 0, 300, 300] }, { label: 'Puerta', box_2d: [700, 0, 800, 100] }] }),
      img,
    )!;
    expect(r.zones.map((z) => z.label)).toEqual(['Menaje']);
    expect(r.layout.doors).toHaveLength(1);
    expect(r.layout.doors[0].wall).toBe('left');
    expect(r.layout.doors[0].start).toBeCloseTo(0.7);
    expect(r.layout.doors[0].end).toBeCloseTo(0.8);
  });

  it('no duplica la puerta si la IA ya la puso en esa pared', () => {
    const r = normalizeSketch(
      json({
        doors: [{ wall: 'left', start: 700, end: 800 }],
        zones: [{ label: 'A', box_2d: [0, 0, 300, 300] }, { label: 'ENTRADA', box_2d: [700, 0, 800, 100] }],
      }),
      img,
    )!;
    expect(r.layout.doors).toHaveLength(1);
  });

  it('normaliza puertas invertidas, estrechas o fuera de la sala y descarta paredes desconocidas', () => {
    const r = normalizeSketch(
      json({
        doors: [
          { wall: 'left', start: 900, end: 850 },
          { wall: 'bottom', start: 990, end: 1200 },
          { wall: 'techo', start: 100, end: 200 },
        ],
        zones: [{ label: 'A', box_2d: [0, 0, 300, 300] }],
      }),
      img,
    )!;
    expect(r.layout.doors).toHaveLength(2);
    const [left, bottom] = r.layout.doors;
    expect(left.end - left.start).toBeCloseTo(0.06);
    expect((left.start + left.end) / 2).toBeCloseTo(0.875);
    expect(bottom.end).toBeLessThanOrEqual(1);
    expect(bottom.end - bottom.start).toBeCloseTo(0.06);
  });

  it('descarta pasillos que tapan una zona y pone "Pasillo" si no tienen nombre', () => {
    const r = normalizeSketch(
      json({
        zones: [{ label: 'A', box_2d: [0, 0, 1000, 300] }],
        corridors: [
          { label: '', box_2d: [0, 350, 1000, 650] },
          { label: 'Otro', box_2d: [0, 100, 1000, 400] },
        ],
      }),
      img,
    )!;
    expect(r.layout.corridors).toHaveLength(1);
    expect(r.layout.corridors[0].label).toBe('Pasillo');
    expect(r.layout.corridors[0].x).toBeCloseTo(0.35);
  });

  it('limita la proporción de la sala a 0.25-4', () => {
    expect(normalizeSketch(json({ zones: [{ label: 'A', box_2d: [0, 0, 500, 500] }] }), { width: 8000, height: 1000 })!.aspectRatio).toBe(4);
    expect(normalizeSketch(json({ zones: [{ label: 'A', box_2d: [0, 0, 500, 500] }] }), { width: 1000, height: 8000 })!.aspectRatio).toBe(0.25);
  });

  it('pone "Zona N" a las zonas sin nombre', () => {
    const r = normalizeSketch(json({ zones: [{ label: '', box_2d: [0, 0, 300, 300] }] }), img)!;
    expect(r.zones[0].label).toBe('Zona 1');
  });

  it('devuelve null si no es JSON o no tiene zonas', () => {
    expect(normalizeSketch('basura', img)).toBeNull();
    expect(normalizeSketch('{"room":{}}', img)).toBeNull();
  });
});
```

- [ ] **Paso 2: comprobar que falla.** `npx vitest run lib/ai/layout.test.ts`. Esperado: FAIL, "Cannot find module './layout'".

- [ ] **Paso 3: implementar.** `lib/ai/layout.ts`:

```ts
import { z } from 'zod';
import { normalizeZones, type RawZone, type Zone } from './normalize';
import { MAX_ASPECT, MIN_ASPECT, type Corridor, type Door, type Layout, type Wall } from '@/lib/layout';

// Respuesta de Gemini en modo sketch -> plano en coordenadas 0-1 relativas a la sala.
// box_2d = [ymin, xmin, ymax, xmax] en 0-1000 sobre la imagen (formato nativo de Gemini).
export type SketchPlan = { zones: Zone[]; layout: Layout; aspectRatio: number };

export const MIN_DOOR = 0.06;
export const MAX_DOOR = 0.4;
export const MAX_CORRIDOR_OVERLAP = 0.2;
const MIN_ROOM_AREA = 0.1; // fracción de la imagen
const MIN_CORRIDOR_AREA = 0.01;
const WALL_NAMES = ['top', 'bottom', 'left', 'right'] as const;
const DOOR_WORDS = new Set(['puerta', 'entrada', 'door']);

const box = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const named = z.object({ label: z.string().catch(''), box_2d: box });
const doorSchema = z.object({ wall: z.enum(WALL_NAMES), start: z.number(), end: z.number() });
const top = z.object({
  room: z.object({ box_2d: box }).nullish().catch(null),
  doors: z.array(z.unknown()).catch([]),
  corridors: z.array(z.unknown()).catch([]),
  zones: z.array(z.unknown()),
});

type Rect = { x: number; y: number; w: number; h: number };
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const each = <T>(schema: z.ZodType<T>, list: unknown[]): T[] =>
  list.flatMap((v) => {
    const r = schema.safeParse(v);
    return r.success ? [r.data] : [];
  });

function overlapRatio(a: Rect, b: Rect): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return b.w * b.h > 0 ? (ix * iy) / (b.w * b.h) : 0;
}

/** Ajusta el ancho de una puerta a MIN_DOOR-MAX_DOOR alrededor de su centro, dentro de la pared. */
function fixDoor(wall: Wall, a: number, b: number): Door {
  const s0 = clamp01(Math.min(a, b));
  const e0 = clamp01(Math.max(a, b));
  const width = Math.min(MAX_DOOR, Math.max(MIN_DOOR, e0 - s0));
  const center = Math.min(1 - width / 2, Math.max(width / 2, (s0 + e0) / 2));
  return { wall, start: center - width / 2, end: center + width / 2 };
}

/** Puerta en la pared más cercana a un rectángulo (para zonas que la IA etiquetó "Puerta"). */
function doorFromRect(r: Rect): Door {
  const dist: Record<Wall, number> = { left: r.x, right: 1 - (r.x + r.w), top: r.y, bottom: 1 - (r.y + r.h) };
  const wall = (Object.keys(dist) as Wall[]).reduce((m, k) => (dist[k] < dist[m] ? k : m));
  return wall === 'left' || wall === 'right' ? fixDoor(wall, r.y, r.y + r.h) : fixDoor(wall, r.x, r.x + r.w);
}

export function normalizeSketch(content: string, img: { width: number; height: number }): SketchPlan | null {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }
  const parsed = top.safeParse(data);
  if (!parsed.success) return null;
  const p = parsed.data;

  // Sala en 0-1000 sobre la imagen; si no vale, la imagen entera.
  let [ry1, rx1, ry2, rx2] = [0, 0, 1000, 1000];
  if (p.room) {
    const [a, b, c, d] = p.room.box_2d;
    const [y1, y2, x1, x2] = [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)].map((n) =>
      Math.min(1000, Math.max(0, n)),
    );
    if ((x2 - x1) * (y2 - y1) >= MIN_ROOM_AREA * 1e6) [ry1, rx1, ry2, rx2] = [y1, x1, y2, x2];
  }
  const rw = rx2 - rx1;
  const rh = ry2 - ry1;
  const toRoom = ([a, b, c, d]: [number, number, number, number]): Rect => {
    const x1 = clamp01((Math.min(b, d) - rx1) / rw);
    const x2 = clamp01((Math.max(b, d) - rx1) / rw);
    const y1 = clamp01((Math.min(a, c) - ry1) / rh);
    const y2 = clamp01((Math.max(a, c) - ry1) / rh);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };

  const doors: Door[] = each(doorSchema, p.doors).map((d) =>
    d.wall === 'left' || d.wall === 'right'
      ? fixDoor(d.wall, (d.start - ry1) / rh, (d.end - ry1) / rh)
      : fixDoor(d.wall, (d.start - rx1) / rw, (d.end - rx1) / rw),
  );

  const raw: RawZone[] = [];
  for (const z of each(named, p.zones)) {
    const r = toRoom(z.box_2d);
    if (DOOR_WORDS.has(fold(z.label))) {
      const door = doorFromRect(r);
      if (!doors.some((d) => d.wall === door.wall)) doors.push(door);
      continue;
    }
    raw.push({ label: z.label, box: [r.x * 1000, r.y * 1000, (r.x + r.w) * 1000, (r.y + r.h) * 1000] });
  }
  const zones = normalizeZones(raw, 'relative1000', { width: 1, height: 1 });
  if (zones.length === 0) return null;

  const corridors: Corridor[] = each(named, p.corridors)
    .map((c) => ({ label: c.label.trim().slice(0, 40) || 'Pasillo', ...toRoom(c.box_2d) }))
    .filter((c) => c.w * c.h >= MIN_CORRIDOR_AREA)
    .filter((c) => !zones.some((z) => overlapRatio(c, z) > MAX_CORRIDOR_OVERLAP))
    .slice(0, 6);

  const aspect = (rw * img.width) / (rh * img.height);
  return {
    zones,
    layout: { doors: doors.slice(0, 8), corridors },
    aspectRatio: Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect)),
  };
}
```

- [ ] **Paso 4: comprobar que pasa.** `npx vitest run lib/ai/layout.test.ts`. Esperado: PASS (9 tests).
  - Si falla "normaliza puertas…", revisa `fixDoor`: el centro de la puerta izquierda es (0.85+0.9)/2 = 0.875.
  - La puerta inferior queda en [0.94, 1].

- [ ] **Paso 5: commit.** `npm test && npm run build`.

```bash
git add lib/ai/layout.ts lib/ai/layout.test.ts
git commit -m "feat(ai): postproceso del plano en modo sketch (sala, puertas, pasillos, zonas)"
```

---

### Tarea 4: modo sketch en Gemini y en la detección

**Archivos:**
- Modificar: `lib/ai/gemini.ts`, `lib/ai/detectZones.ts`, `scripts/try-detect.ts`
- Test: `lib/ai/gemini.test.ts`, `lib/ai/detectZones.test.ts`

**Interfaces:**
- Consume: `normalizeSketch` (Tarea 3), `Layout` (Tarea 1).
- Produce:
  - `type VisionMode = 'photo' | 'sketch'`, `SKETCH_PROMPT`
  - `callVisionModel(imageBase64: string, signal?: AbortSignal, mode: VisionMode = 'photo'): Promise<string>`. En sketch devuelve el texto tal cual, sin reordenar.
  - `detectZonesFromImage(imageBase64, img, call = callVisionModel, mode: VisionMode = 'photo')`
  - `DetectResult = { ok: true; zones: Zone[]; layout?: Layout; aspectRatio?: number } | { ok: false; reason: 'NO_ZONES' | 'TIMEOUT' | 'UNAVAILABLE' }`

- [ ] **Paso 1: tests.** En `lib/ai/gemini.test.ts`, cambia el import a `import { callVisionModel, SKETCH_PROMPT } from './gemini';` y añade dentro del `describe`:

```ts
  it('en modo sketch envía el prompt y el esquema de plano y devuelve el texto sin reordenar', async () => {
    const text = '{"room":{"box_2d":[0,0,1000,1000]},"doors":[],"corridors":[],"zones":[{"label":"","box_2d":[1,2,3,4]}]}';
    fetchMock.mockResolvedValue(geminiResponse(text));
    expect(await callVisionModel('b64', undefined, 'sketch')).toBe(text);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[1].text).toBe(SKETCH_PROMPT);
    expect(body.generationConfig.responseSchema.required).toContain('room');
  });
```

En `lib/ai/detectZones.test.ts`, añade dentro del `describe`:

```ts
  const sketch = JSON.stringify({
    room: { box_2d: [0, 0, 1000, 1000] },
    doors: [{ wall: 'left', start: 700, end: 800 }],
    corridors: [],
    zones: [{ label: 'Menaje', box_2d: [0, 0, 500, 500] }],
  });

  it('en modo sketch pasa el modo a la llamada y devuelve layout y proporción', async () => {
    const call = vi.fn().mockResolvedValue(sketch);
    const r = await detectZonesFromImage('b64', img, call, 'sketch');
    expect(call).toHaveBeenCalledWith('b64', expect.any(AbortSignal), 'sketch');
    expect(r.ok && r.zones[0].label).toBe('Menaje');
    expect(r.ok && r.layout?.doors).toEqual([{ wall: 'left', start: 0.7, end: 0.8 }]);
    expect(r.ok && r.aspectRatio).toBe(1);
  });

  it('en modo sketch reintenta si la respuesta no sirve y acaba en NO_ZONES', async () => {
    const call = vi.fn().mockResolvedValue('{"room":{"box_2d":[0,0,1000,1000]},"zones":[]}');
    expect(await detectZonesFromImage('b64', img, call, 'sketch')).toEqual({ ok: false, reason: 'NO_ZONES' });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('en modo foto no devuelve layout', async () => {
    const call = vi.fn().mockResolvedValue(good);
    const r = await detectZonesFromImage('b64', img, call);
    expect(call).toHaveBeenCalledWith('b64', expect.any(AbortSignal), 'photo');
    expect(r.ok && r.layout).toBeUndefined();
  });
```

- [ ] **Paso 2: comprobar que fallan.** `npx vitest run lib/ai`. Esperado: FAIL en los 4 tests nuevos (`SKETCH_PROMPT` no existe, y la llamada no recibe el modo).

- [ ] **Paso 3: implementar en `lib/ai/gemini.ts`.**
  - Debajo de `PROMPT`, añade:

```ts
export type VisionMode = 'photo' | 'sketch';

export const SKETCH_PROMPT = `This is a hand-drawn TOP-DOWN sketch of a storage room. Turn it into a clean floor plan.
All boxes are box_2d = [ymin, xmin, ymax, xmax] on a 0-1000 scale of the image.
- room: the box of the room's inner walls. If no outer walls are drawn, use the drawing area.
- doors: each door or entrance: the wall it is on ("top","bottom","left","right") and its start/end along that wall on the 0-1000 image scale (y for left/right walls, x for top/bottom walls). A gap in a wall, a mark on a wall or a word like "Puerta"/"Entrada" means a door.
- corridors: free walking areas actually drawn or labelled (e.g. "Pasillo"), as box_2d. Do not invent corridors.
- zones: every storage area, as box_2d, with the name written inside it (empty string if none). Zones sit against the walls and must not overlap.
Doors and corridors are NOT zones: an area labelled "Puerta", "Entrada" or "Door" is a DOOR on the wall it touches, never a zone.`;

const box2d = { type: 'ARRAY', items: { type: 'NUMBER' } };
const sketchSchema = {
  type: 'OBJECT',
  properties: {
    room: { type: 'OBJECT', properties: { box_2d: box2d }, required: ['box_2d'] },
    doors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { wall: { type: 'STRING' }, start: { type: 'NUMBER' }, end: { type: 'NUMBER' } },
        required: ['wall', 'start', 'end'],
      },
    },
    corridors: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, box_2d: box2d }, required: ['label', 'box_2d'] },
    },
    zones: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, box_2d: box2d }, required: ['label', 'box_2d'] },
    },
  },
  required: ['room', 'doors', 'corridors', 'zones'],
};
```

  - Cambia la firma a `export async function callVisionModel(imageBase64: string, signal?: AbortSignal, mode: VisionMode = 'photo'): Promise<string> {`.
  - En el `body`, sustituye `{ text: PROMPT }` por `{ text: mode === 'sketch' ? SKETCH_PROMPT : PROMPT }` y `responseSchema,` por `responseSchema: mode === 'sketch' ? sketchSchema : responseSchema,`.
  - Cambia la última línea a:

```ts
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return mode === 'sketch' ? text : toAppFormat(text);
```

- [ ] **Paso 4: implementar en `lib/ai/detectZones.ts`.** Sustituye el archivo por:

```ts
import { callVisionModel, type VisionMode } from './gemini';
import { normalizeZones, type BoxFormat, type Zone } from './normalize';
import { normalizeSketch } from './layout';
import { parseAiContent } from './schema';
import type { Layout } from '@/lib/layout';

export const AI_TIMEOUT_MS = 55_000;

export type DetectResult =
  | { ok: true; zones: Zone[]; layout?: Layout; aspectRatio?: number }
  | { ok: false; reason: 'NO_ZONES' | 'TIMEOUT' | 'UNAVAILABLE' };

export async function detectZonesFromImage(
  imageBase64: string,
  img: { width: number; height: number },
  call: typeof callVisionModel = callVisionModel,
  mode: VisionMode = 'photo',
): Promise<DetectResult> {
  const format = (process.env.AI_BOX_FORMAT ?? 'pixels') as BoxFormat;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await call(imageBase64, controller.signal, mode);
      if (mode === 'sketch') {
        const plan = normalizeSketch(content, img);
        if (plan) return { ok: true, ...plan };
        continue;
      }
      const raw = parseAiContent(content);
      if (raw) {
        const zones = normalizeZones(raw, format, img);
        if (zones.length > 0) return { ok: true, zones };
      }
    }
    return { ok: false, reason: 'NO_ZONES' };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, reason: 'TIMEOUT' };
    console.error('detectZones', e);
    return { ok: false, reason: 'UNAVAILABLE' };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Paso 5: script de prueba.** En `scripts/try-detect.ts`:
  - cambia `const file = process.argv[2];` por `const [file, mode = 'photo'] = process.argv.slice(2);`;
  - el mensaje de uso por `'Uso: npx tsx --env-file=.env.local scripts/try-detect.ts <foto.jpg> [photo|sketch]'`;
  - la llamada por `detectZonesFromImage(buf.toString('base64'), { width, height }, undefined, mode === 'sketch' ? 'sketch' : 'photo')`.

- [ ] **Paso 6: comprobar.**
  - `npx vitest run lib/ai`. Esperado: PASS.
  - Después, la prueba real: `npx tsx --env-file=.env.local scripts/try-detect.ts ~/Desktop/ADS.png sketch`. Esperado:
    - unas 11 zonas con nombre (sin "Puerta");
    - `layout.doors` con una puerta en `left`;
    - `aspectRatio` cerca de 0.78.

  Si Gemini devuelve 503, repite.

- [ ] **Paso 7: commit.** `npm test && npm run build`.

```bash
git add lib/ai/gemini.ts lib/ai/gemini.test.ts lib/ai/detectZones.ts lib/ai/detectZones.test.ts scripts/try-detect.ts
git commit -m "feat(ai): modo sketch que devuelve la estructura de la sala"
```

---

### Tarea 5: editor de plano con el plano profesional

**Archivos:**
- Modificar:
  - `app/g/[groupId]/w/[whId]/edit/actions.ts`
  - `app/g/[groupId]/w/[whId]/edit/page.tsx`
  - `app/g/[groupId]/w/[whId]/edit/PlanEditorClient.tsx` (se sustituye entero)
  - `components/ZoneEditor.tsx`

**Interfaces:**
- Consume:
  - `Layout`, `PlanSource`, `DEFAULT_LAYOUT`, `parseStoredLayout`, `validatePlan` (Tarea 1)
  - `FloorPlan` (Tarea 2)
  - `detectZonesFromImage(..., mode)` y `DetectResult` (Tarea 4)
- Produce:
  - `setPlanImage(groupId, warehouseId, path, aspectRatio, source: PlanSource)`
  - `detectZonesAction(groupId, warehouseId)`: lee `plan_source` y elige el modo.
  - `saveZones(groupId, warehouseId, zones, plan?: { layout: Layout; aspectRatio: number })`
  - `<ZoneEditor imageUrl layout aspectRatio zones onChange />`

- [ ] **Paso 1: acciones.** En `app/g/[groupId]/w/[whId]/edit/actions.ts`:
  1. Añade el import `import { validatePlan, type Layout, type PlanSource } from '@/lib/layout';`.
  2. En `setPlanImage`, añade el parámetro `source: PlanSource` después de `aspectRatio: number`. Añade `|| (source !== 'sketch' && source !== 'photo')` a la condición que devuelve `'Foto no válida.'`. Cambia el `update` a `.update({ plan_image_path: path, aspect_ratio: aspectRatio, plan_source: source, layout: null })`.
  3. En `detectZonesAction`, cambia el `select` a `.select('plan_image_path, plan_source')` y la última línea a:

```ts
  return detectZonesFromImage(buf.toString('base64'), { width, height }, undefined, wh.plan_source === 'sketch' ? 'sketch' : 'photo');
```

  4. En `saveZones`:
     - añade el parámetro `plan?: { layout: Layout; aspectRatio: number }` después de `zones: EditableZone[],`;
     - justo después de `if (invalid) return { error: invalid };` añade:

```ts
  if (plan) {
    const badPlan = validatePlan(plan);
    if (badPlan) return { error: badPlan };
  }
```

     - justo después del bloque `if (toDelete.length > 0) { ... }` (antes de `const rows = ...`) añade:

```ts
  if (plan) {
    const { error } = await supabase
      .from('warehouses')
      .update({ layout: plan.layout, aspect_ratio: plan.aspectRatio })
      .eq('id', warehouseId)
      .eq('group_id', groupId);
    if (error) return { error: 'No se ha podido guardar el plano.' };
  }
```

- [ ] **Paso 2: página del editor.** En `app/g/[groupId]/w/[whId]/edit/page.tsx`:
  - añade `import { DEFAULT_LAYOUT, parseStoredLayout } from '@/lib/layout';`;
  - cambia el `select` del almacén a `'id, name, plan_image_path, aspect_ratio, plan_source, layout'`;
  - pasa a `PlanEditorClient` estas dos props más, después de `aspectRatio=...`:

```tsx
      planSource={wh.plan_source === 'sketch' || wh.plan_source === 'photo' ? wh.plan_source : null}
      initialLayout={wh.plan_source === 'sketch' ? parseStoredLayout(wh.layout) ?? DEFAULT_LAYOUT : null}
```

- [ ] **Paso 3: `ZoneEditor` con fondo de plano.** En `components/ZoneEditor.tsx`:
  - añade los imports `import { FloorPlan } from '@/components/FloorPlan';` y `import type { Layout } from '@/lib/layout';`;
  - en `Props`, añade `layout: Layout | null;` y en la firma desestructura `{ imageUrl, layout, aspectRatio, zones, onChange }`;
  - en el `style` del contenedor, sustituye las dos líneas de fondo por:

```tsx
          backgroundImage: layout ? undefined : imageUrl ? `url("${imageUrl}")` : GRID,
          backgroundSize: layout ? undefined : imageUrl ? '100% 100%' : '24px 24px',
```

  - como primer hijo del contenedor (antes de `{width > 0 && ...}`), añade:

```tsx
        {layout && (
          <FloorPlan aspectRatio={aspectRatio} layout={layout} className="pointer-events-none absolute inset-0 h-full w-full" />
        )}
```

- [ ] **Paso 4: cliente del editor.** Sustituye `app/g/[groupId]/w/[whId]/edit/PlanEditorClient.tsx` entero por:

```tsx
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZoneEditor } from '@/components/ZoneEditor';
import { PhotoCapture } from '@/components/PhotoCapture';
import { SketchPad } from '@/components/SketchPad';
import { Button } from '@/components/ui/button';
import { imageAspect, uploadPhoto } from '@/lib/photos';
import { fromDetected, type EditableZone } from '@/lib/zones';
import { DEFAULT_LAYOUT, type Layout, type PlanSource } from '@/lib/layout';
import type { DetectResult } from '@/lib/ai/detectZones';
import { detectZonesAction, saveZones, setPlanImage } from './actions';

const AI_MESSAGES = {
  NO_ZONES: 'No he podido detectar zonas, dibújalas tú.',
  TIMEOUT: 'La IA ha tardado demasiado. Dibuja las zonas a mano o inténtalo de nuevo.',
  UNAVAILABLE: 'La IA no está disponible ahora. Puedes dibujar las zonas a mano.',
} as const;

type Props = {
  groupId: string;
  warehouseId: string;
  name: string;
  imageUrl: string | null;
  aspectRatio: number;
  planSource: PlanSource | null;
  initialLayout: Layout | null;
  initialZones: EditableZone[];
};

export function PlanEditorClient({
  groupId,
  warehouseId,
  name,
  imageUrl: initialUrl,
  aspectRatio,
  planSource,
  initialLayout,
  initialZones,
}: Props) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [aspect, setAspect] = useState(aspectRatio);
  const [source, setSource] = useState<PlanSource | null>(planSource);
  const [layout, setLayout] = useState<Layout | null>(initialLayout);
  const [uploadKind, setUploadKind] = useState<PlanSource>('photo');
  const [zones, setZones] = useState(initialZones);
  const [sketching, setSketching] = useState(false);
  const [uploadingSketch, setUploadingSketch] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const runId = useRef(0);
  const legacyGrid = initialZones.length > 0; // almacenes antiguos con zonas sobre cuadrícula

  async function runDetection(src: PlanSource | null) {
    const id = ++runId.current;
    setDetecting(true);
    setMessage(null);
    let r: DetectResult;
    try {
      r = await detectZonesAction(groupId, warehouseId);
    } catch {
      r = { ok: false as const, reason: 'UNAVAILABLE' as const };
    }
    if (id !== runId.current) return; // se canceló mientras esperaba
    setDetecting(false);
    if (r.ok) {
      setZones(fromDetected(r.zones));
      if (r.layout && r.aspectRatio) {
        setLayout(r.layout);
        setAspect(r.aspectRatio);
      }
    } else {
      setMessage(AI_MESSAGES[r.reason]);
      if (src === 'sketch') setLayout((l) => l ?? DEFAULT_LAYOUT);
    }
  }

  function cancelDetection() {
    runId.current++;
    setDetecting(false);
    if (source === 'sketch') setLayout((l) => l ?? DEFAULT_LAYOUT);
    setMessage('Detección cancelada. Puedes dibujar las zonas a mano.');
  }

  async function onPlanUploaded(path: string, file: File, src: PlanSource) {
    const ratio = await imageAspect(file);
    const r = await setPlanImage(groupId, warehouseId, path, ratio, src);
    if ('error' in r) {
      setMessage(r.error);
      return;
    }
    setImageUrl(r.url);
    setAspect(ratio);
    setSource(src);
    setLayout(null);
    if (src === 'sketch' || zones.length === 0) await runDetection(src);
  }

  async function onSketchDone(file: File) {
    setUploadingSketch(true);
    setMessage(null);
    let path: string;
    try {
      path = await uploadPhoto(file, groupId, 'plans');
    } catch (err) {
      console.error('uploadSketch', err);
      setMessage('No se ha podido subir el dibujo. Inténtalo de nuevo.');
      setUploadingSketch(false);
      return;
    }
    setUploadingSketch(false);
    setSketching(false);
    await onPlanUploaded(path, file, 'sketch');
  }

  function redraw() {
    if (zones.length > 0 && !confirm('Vas a dibujar el plano de nuevo y la IA reemplazará las zonas actuales. ¿Seguir?')) return;
    setSketching(true);
  }

  async function redetect() {
    if (zones.length > 0 && !confirm('Esto reemplaza las zonas actuales por las que detecte la IA. ¿Seguir?')) return;
    await runDetection(source);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const r = await saveZones(groupId, warehouseId, zones, layout ? { layout, aspectRatio: aspect } : undefined);
    setSaving(false);
    if ('error' in r) setMessage(r.error);
    else router.push(`/g/${groupId}/w/${warehouseId}`);
  }

  const showEditor = imageUrl !== null || legacyGrid;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Plano de {name}</h1>

      {sketching ? (
        <div className="space-y-2">
          <SketchPad busy={uploadingSketch} onDone={onSketchDone} />
          {showEditor && (
            <Button variant="outline" onClick={() => setSketching(false)} disabled={uploadingSketch}>
              Cancelar
            </Button>
          )}
        </div>
      ) : (
        !showEditor && (
          <div className="space-y-3">
            <p>Dibuja el almacén visto desde arriba y la IA creará un plano limpio con sus zonas.</p>
            <Button onClick={() => setSketching(true)}>Dibujar el plano aquí</Button>
            <fieldset className="space-y-2 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">O sube una imagen</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="upload-kind" checked={uploadKind === 'photo'} onChange={() => setUploadKind('photo')} />
                  Foto del almacén
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="upload-kind" checked={uploadKind === 'sketch'} onChange={() => setUploadKind('sketch')} />
                  Boceto en planta
                </label>
              </div>
              <PhotoCapture
                groupId={groupId}
                kind="plans"
                label={uploadKind === 'sketch' ? 'Subir boceto' : 'Subir foto'}
                onUploaded={(path, file) => onPlanUploaded(path, file, uploadKind)}
              />
            </fieldset>
          </div>
        )
      )}

      {detecting && (
        <div role="status" className="flex items-center gap-3 rounded-lg border p-3">
          <span>Detectando zonas… puede tardar hasta un minuto.</span>
          <Button variant="outline" size="sm" onClick={cancelDetection}>Cancelar</Button>
        </div>
      )}

      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}

      {showEditor && !sketching && !detecting && (
        <>
          <ZoneEditor imageUrl={imageUrl} layout={layout} aspectRatio={aspect} zones={zones} onChange={setZones} />
          <div className="flex flex-wrap items-start gap-2">
            {source === 'sketch' && <Button variant="outline" onClick={redraw}>Redibujar</Button>}
            {imageUrl ? (
              <Button variant="outline" onClick={redetect}>Volver a detectar con IA</Button>
            ) : (
              <PhotoCapture
                groupId={groupId}
                kind="plans"
                label="Añadir foto de fondo"
                onUploaded={(path, file) => onPlanUploaded(path, file, 'photo')}
              />
            )}
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar plano'}</Button>
          </div>
        </>
      )}
    </main>
  );
}
```

- [ ] **Paso 5: tipos, lint y tests.** `npx tsc --noEmit && npx eslint "app/g/[groupId]/w/[whId]/edit" components/ZoneEditor.tsx && npm test`. Esperado: sin errores y todos los tests en PASS. Esta tarea no añade tests unitarios: la lógica pura está probada en las Tareas 1, 3 y 4.

- [ ] **Paso 6: probar a mano (requiere la migración de la Tarea 1, paso 7).** Con `npm run dev`:
  1. **Lienzo:**
     - crea el almacén "Prueba plano" y pulsa "Dibujar el plano aquí";
     - dibuja el contorno, una puerta (hueco en una pared) y 3-4 rectángulos;
     - pulsa "Listo".

     Esperado: tras "Detectando zonas…", un plano con muros rayados, el arco de la puerta y las zonas "Zona 1…" encima, sin trazos a mano.
  2. **Guardar:** nombra 2 zonas, pulsa "Guardar plano" y vuelve a `/edit`. Esperado: el mismo plano profesional.
  3. **Boceto subido:** crea otro almacén, elige "Boceto en planta" y sube `~/Desktop/ADS.png`. Esperado: un plano parecido al de la spike.
  4. **Foto:** crea otro almacén, deja "Foto del almacén" y sube una foto. Esperado: como antes, con zonas sobre la foto.
  5. **IA caída:** en `.env.local`, pon `GEMINI_MODEL=modelo-que-no-existe`, reinicia `npm run dev`, dibuja y pulsa "Listo". Esperado: "La IA no está disponible ahora…" y una sala vacía con muros donde se puede "Añadir zona". Vuelve a dejar `GEMINI_MODEL=gemini-3.5-flash-lite`.

- [ ] **Paso 7: commit.** `npm test && npm run build`.

```bash
git add "app/g/[groupId]/w/[whId]/edit" components/ZoneEditor.tsx
git commit -m "feat(plan): el editor guarda y muestra el plano profesional"
```

- [ ] **Paso 8: comprobar el caso de material (Review Focus 1).** Esto se hace después de la Tarea 6, que permite añadir material:
  - en "Prueba plano", añade material a una zona;
  - vuelve a `/edit`, pulsa "Redibujar", dibuja otra cosa y pulsa "Guardar plano".

  Esperado: el mensaje "Mueve o borra el material de «…» antes de eliminar esas zonas." y el material sigue en su zona. Si no es así, para y depura antes de seguir.

---

### Tarea 6: vista del almacén con el plano profesional

**Archivos:**
- Modificar: `app/g/[groupId]/w/[whId]/page.tsx`, `components/PlanView.tsx`

**Interfaces:**
- Consume: `FloorPlan` (Tarea 2); `Layout`, `DEFAULT_LAYOUT`, `parseStoredLayout` (Tarea 1).
- Produce: `<PlanView ... layout={Layout | null} />`.

- [ ] **Paso 1: página.** En `app/g/[groupId]/w/[whId]/page.tsx`:
  - añade `import { DEFAULT_LAYOUT, parseStoredLayout } from '@/lib/layout';`;
  - cambia el `select` del almacén a `'id, name, plan_image_path, aspect_ratio, plan_source, layout'`;
  - pasa a `<PlanView ... />` la prop:

```tsx
          layout={wh.plan_source === 'sketch' ? parseStoredLayout(wh.layout) ?? DEFAULT_LAYOUT : null}
```

- [ ] **Paso 2: `PlanView`.** En `components/PlanView.tsx`:
  1. Añade los imports `import { FloorPlan } from '@/components/FloorPlan';` y `import type { Layout } from '@/lib/layout';`.
  2. En `Props`, añade `layout: Layout | null;` y desestructura `layout` en la firma.
  3. En el `style` del contenedor del plano, sustituye las dos líneas de fondo por:

```tsx
          backgroundImage: layout ? undefined : imageUrl ? `url("${imageUrl}")` : GRID,
          backgroundSize: layout ? undefined : imageUrl ? '100% 100%' : '24px 24px',
```

  4. Como primer hijo de ese contenedor (antes de `{zones.map(...)}`), añade:

```tsx
        {layout && (
          <FloorPlan aspectRatio={aspectRatio} layout={layout} className="pointer-events-none absolute inset-0 h-full w-full" />
        )}
```

  5. Sustituye el `<span ...>{z.label}</span>` de la etiqueta de cada zona por:

```tsx
              {layout ? (
                <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-xs font-semibold text-gray-900 sm:text-sm">
                  {z.label}
                </span>
              ) : (
                <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium text-gray-900">{z.label}</span>
              )}
```

  6. En el `className` del `<button>` de cada zona, cambia `rounded-sm` por `${layout ? 'rounded-md' : 'rounded-sm'}`. El `className` pasa a ser una plantilla de texto.

- [ ] **Paso 3: tipos, lint y tests.** `npx tsc --noEmit && npx eslint components/PlanView.tsx "app/g/[groupId]/w/[whId]/page.tsx" && npm test`. Esperado: sin errores.

- [ ] **Paso 4: probar a mano.**
  1. Abre "Prueba plano" (`/g/.../w/...`). Esperado: el plano profesional con las zonas y su nombre centrado.
  2. Toca una zona, añade "Ollas" (cantidad 3) y busca "olla". Esperado: la zona se resalta y las demás se atenúan.
  3. Abre un almacén de foto. Esperado: igual que antes.
  4. Repite el punto 1 en el móvil (`http://<ip-del-mac>:3000`).
  5. Haz ahora el paso 8 de la Tarea 5.

- [ ] **Paso 5: commit.** `npm test && npm run build`.

```bash
git add components/PlanView.tsx "app/g/[groupId]/w/[whId]/page.tsx"
git commit -m "feat(plan): la vista del almacén muestra el plano profesional"
```

---

### Tarea 7: documentación del cambio

**Archivos:**
- Modificar: `docs/plans/2026-10-14-zulo-plan.md` (sección "Rulings durante la ejecución"), `CLAUDE.md`

- [ ] **Paso 1: ruling.** Al final de "Rulings durante la ejecución" en `docs/plans/2026-10-14-zulo-plan.md`, añade:

```markdown
- **Plano profesional (2026-10-16, spec `docs/specs/2026-10-15-plano-profesional-design.md`, plan `docs/plans/2026-10-16-plano-profesional-plan.md`):**
  - Los planos dibujados o subidos como "Boceto en planta" (`plan_source = 'sketch'`) se muestran como plano tipo arquitecto (`components/FloorPlan.tsx`).
  - Gemini en modo sketch devuelve sala, puertas, pasillos y zonas. `lib/ai/layout.ts` los pasa a 0-1 relativos a la sala, y se guardan en `warehouses.layout`.
  - En esos planos, `aspect_ratio` es la proporción de la sala.
  - Las fotos no cambian.
  - Migración `20261016090000_warehouse_layout.sql`.
  - Muros y puertas no se editan a mano: se redibuja.
```

- [ ] **Paso 2: `CLAUDE.md`.** En la línea **Estado**, añade al final: `Plano profesional (boceto → plano tipo arquitecto) hecho; ver ruling del 2026-10-16.`

- [ ] **Paso 3: commit.**

```bash
git add docs/plans/2026-10-14-zulo-plan.md CLAUDE.md
git commit -m "docs: ruling del plano profesional"
```
