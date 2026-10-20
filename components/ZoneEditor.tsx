'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { Rnd, type HandleComponent, type HandleStyles } from 'react-rnd';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { PALETTE, clampZone, type EditableZone } from '@/lib/zones';
import { NUDGE, handleRects, nudgeZone, zoneKeyAction, type HandleRect, type ZoneNudge } from '@/lib/zoneKeys';
import { FloorPlan } from '@/components/FloorPlan';
import type { Layout } from '@/lib/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoneOverlay } from '@/components/ZoneOverlay';
import { zoneSwatch } from '@/lib/zoneColors';

type Props = {
  imageUrl: string | null;
  layout: Layout | null;
  aspectRatio: number;
  zones: EditableZone[];
  onChange: (zones: EditableZone[]) => void;
  selected: string | null;
  onSelect: (key: string | null) => void;
};

// Cuadrícula de fondo de los almacenes antiguos sin imagen (solo pantalla, con los tokens del plano).
const GRID =
  'linear-gradient(to right, var(--plan-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--plan-grid) 1px, transparent 1px)';

// Asas de react-rnd: área táctil de hasta 44 px (handleRects la recorta en zonas pequeñas para que el centro
// siga siendo arrastrable); lo visible es un punto en cada lado y un triángulo de 24 px en la esquina.
// Lo visible no recibe eventos: solo cuenta el área calculada.
function handleStyles(w: number, h: number): HandleStyles {
  const toStyle = (r: HandleRect): CSSProperties => ({
    left: r.x, top: r.y, width: r.w, height: r.h, right: 'auto', bottom: 'auto', margin: 0,
  });
  const r = handleRects(w, h);
  return { top: toStyle(r.top), bottom: toStyle(r.bottom), left: toStyle(r.left), right: toStyle(r.right), bottomRight: toStyle(r.bottomRight) };
}
const dot = (
  <span className="pointer-events-none absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background" />
);
const HANDLES: HandleComponent = {
  top: dot,
  bottom: dot,
  left: dot,
  right: dot,
  // El área está centrada en la esquina: el triángulo termina en su centro, dentro de la zona.
  bottomRight: (
    <span className="pointer-events-none absolute right-1/2 bottom-1/2 size-6 bg-foreground [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
  ),
};
const RESIZE_SELECTED = { top: true, right: true, bottom: true, left: true, bottomRight: true };

/** Plano con las zonas arrastrables. La zona elegida se edita en `ZoneDetails`. */
export function ZoneEditor({ imageUrl, layout, aspectRatio, zones, onChange, selected, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = width / aspectRatio;
  const update = (key: string, patch: Partial<EditableZone>) =>
    onChange(zones.map((z) => (z.key === key ? clampZone({ ...z, ...patch }) : z)));

  function onZoneKey(e: KeyboardEvent, z: EditableZone) {
    const n = zoneKeyAction(e.key, { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey });
    if (!n) return;
    e.preventDefault(); // las flechas no hacen scroll
    onSelect(z.key);
    onChange(zones.map((o) => (o.key === z.key ? nudgeZone(o, n) : o)));
  }

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative w-full touch-none overflow-hidden rounded-lg border border-input"
        style={{
          height,
          backgroundColor: layout || imageUrl ? undefined : 'var(--plan-paper)',
          backgroundImage: layout ? undefined : imageUrl ? `url("${imageUrl}")` : GRID,
          backgroundSize: layout ? undefined : imageUrl ? '100% 100%' : '24px 24px',
        }}
      >
        {layout && (
          <FloorPlan aspectRatio={aspectRatio} layout={layout} className="pointer-events-none absolute inset-0 h-full w-full" />
        )}
        {width > 0 &&
          zones.map((z, i) => {
            const isSel = selected === z.key;
            return (
              <Rnd
                key={z.key}
                bounds="parent"
                size={{ width: z.w * width, height: z.h * height }}
                position={{ x: z.x * width, y: z.y * height }}
                className={isSel ? 'rounded-[6px] shadow-md' : undefined}
                style={isSel ? { zIndex: 10 } : undefined}
                enableResizing={isSel ? RESIZE_SELECTED : false}
                resizeHandleStyles={isSel ? handleStyles(z.w * width, z.h * height) : undefined}
                resizeHandleComponent={HANDLES}
                onDragStart={() => onSelect(z.key)}
                onDragStop={(_e, d) => update(z.key, { x: d.x / width, y: d.y / height })}
                onResizeStop={(_e, _dir, el, _delta, pos) =>
                  update(z.key, { w: el.offsetWidth / width, h: el.offsetHeight / height, x: pos.x / width, y: pos.y / height })
                }
              >
                {/* Las zonas aparecen una a una (40 ms de desfase); con reduced-motion la regla global lo anula. */}
                <div
                  className="h-full w-full animate-in fade-in fill-mode-backwards"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onKeyDown={(e) => onZoneKey(e, z)}
                >
                  <ZoneOverlay
                    label={z.label}
                    color={z.color}
                    selected={isSel}
                    onClick={() => onSelect(z.key)}
                    aria-pressed={isSel}
                    ariaLabel={`Zona ${z.label}`}
                  />
                </div>
              </Rnd>
            );
          })}
      </div>
      <p className="text-sm text-muted-foreground">
        Toca una zona para elegirla, arrástrala para moverla y usa las asas para cambiar su tamaño. Con el teclado: flechas
        para mover (Mayús para pasos grandes) y Mayús + Alt + flechas para el tamaño.
      </p>
    </div>
  );
}

function IconTip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const pct = (n: number) => `${Math.round(n * 100)} %`;

type DetailsProps = {
  zone: EditableZone;
  onUpdate: (patch: Partial<EditableZone>) => void;
  onRemove: () => void;
};

/** Panel de la zona elegida: nombre, color con nombre, posición y tamaño sin arrastrar, y eliminar. */
export function ZoneDetails({ zone, onUpdate, onRemove }: DetailsProps) {
  const nudge = (n: ZoneNudge) => onUpdate(nudgeZone(zone, n));
  const move = (dx: number, dy: number) => nudge({ kind: 'move', dx, dy });
  const resize = (dx: number, dy: number) => nudge({ kind: 'resize', dx, dy });
  const current = zoneSwatch(zone.color);

  return (
    <section aria-labelledby="zone-details-title" className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
      <h2 id="zone-details-title" className="text-[17px] leading-6 font-semibold">
        Zona seleccionada
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="zone-label">Nombre de la zona</Label>
        <Input id="zone-label" value={zone.label} maxLength={60} onChange={(e) => onUpdate({ label: e.target.value })} />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          Color <span className="text-muted-foreground">· {current.name}</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.map((c) => {
            const s = zoneSwatch(c);
            const on = zone.color === c;
            return (
              <IconTip key={c} label={s.name}>
                <button
                  type="button"
                  aria-label={s.name}
                  aria-pressed={on}
                  onClick={() => onUpdate({ color: c })}
                  className="flex size-11 items-center justify-center rounded-full border-2 border-transparent bg-(--sw) text-(--sw-ink) outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-pressed:border-foreground dark:bg-(--sw-dark) dark:text-(--sw-ink-dark)"
                  style={
                    {
                      '--sw': s.light.fill,
                      '--sw-ink': s.light.chipText,
                      '--sw-dark': s.dark.fill,
                      '--sw-ink-dark': s.dark.chipText,
                    } as CSSProperties
                  }
                >
                  {on && <Check aria-hidden="true" strokeWidth={2.5} className="size-5" />}
                </button>
              </IconTip>
            );
          })}
        </div>
      </fieldset>

      {/* Alternativa al arrastre (WCAG 2.1.1): pasos del 2 %. */}
      <details className="group rounded-lg border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden="true" className="size-4 transition-transform group-open:rotate-90" />
          Posición y tamaño
        </summary>
        <div className="space-y-3 px-3 pb-3">
          <p aria-live="polite" className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
            X {pct(zone.x)} · Y {pct(zone.y)} · {pct(zone.w)} × {pct(zone.h)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Mover">
            <span className="w-14 text-sm">Mover</span>
            <IconTip label="Mover a la izquierda">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Mover a la izquierda" onClick={() => move(-NUDGE, 0)}>
                <ArrowLeft aria-hidden="true" />
              </Button>
            </IconTip>
            <IconTip label="Mover arriba">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Mover arriba" onClick={() => move(0, -NUDGE)}>
                <ArrowUp aria-hidden="true" />
              </Button>
            </IconTip>
            <IconTip label="Mover abajo">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Mover abajo" onClick={() => move(0, NUDGE)}>
                <ArrowDown aria-hidden="true" />
              </Button>
            </IconTip>
            <IconTip label="Mover a la derecha">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Mover a la derecha" onClick={() => move(NUDGE, 0)}>
                <ArrowRight aria-hidden="true" />
              </Button>
            </IconTip>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Ancho">
            <span className="w-14 text-sm">Ancho</span>
            <IconTip label="Menos ancha">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Menos ancha" onClick={() => resize(-NUDGE, 0)}>
                <Minus aria-hidden="true" />
              </Button>
            </IconTip>
            <IconTip label="Más ancha">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Más ancha" onClick={() => resize(NUDGE, 0)}>
                <Plus aria-hidden="true" />
              </Button>
            </IconTip>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Alto">
            <span className="w-14 text-sm">Alto</span>
            <IconTip label="Menos alta">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Menos alta" onClick={() => resize(0, -NUDGE)}>
                <Minus aria-hidden="true" />
              </Button>
            </IconTip>
            <IconTip label="Más alta">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Más alta" onClick={() => resize(0, NUDGE)}>
                <Plus aria-hidden="true" />
              </Button>
            </IconTip>
          </div>
        </div>
      </details>

      <Button type="button" variant="destructive" onClick={onRemove}>
        <Trash2 aria-hidden="true" strokeWidth={1.75} className="size-5" />
        Eliminar zona
      </Button>
    </section>
  );
}
