'use client';
import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { PALETTE, clampZone, newZone, type EditableZone } from '@/lib/zones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  imageUrl: string | null;
  aspectRatio: number;
  zones: EditableZone[];
  onChange: (zones: EditableZone[]) => void;
};

const GRID =
  'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)';

export function ZoneEditor({ imageUrl, aspectRatio, zones, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

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
  const remove = (key: string) => {
    onChange(zones.filter((z) => z.key !== key));
    setSelected(null);
  };
  const add = () => {
    const z = newZone(zones.length);
    onChange([...zones, z]);
    setSelected(z.key);
  };
  const sel = zones.find((z) => z.key === selected);

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="relative w-full touch-none overflow-hidden rounded-lg border"
        style={{
          height,
          backgroundImage: imageUrl ? `url("${imageUrl}")` : GRID,
          backgroundSize: imageUrl ? '100% 100%' : '24px 24px',
        }}
      >
        {width > 0 &&
          zones.map((z) => (
            <Rnd
              key={z.key}
              bounds="parent"
              size={{ width: z.w * width, height: z.h * height }}
              position={{ x: z.x * width, y: z.y * height }}
              onDragStart={() => setSelected(z.key)}
              onDragStop={(_e, d) => update(z.key, { x: d.x / width, y: d.y / height })}
              onResizeStop={(_e, _dir, el, _delta, pos) =>
                update(z.key, { w: el.offsetWidth / width, h: el.offsetHeight / height, x: pos.x / width, y: pos.y / height })
              }
              style={{
                border: `2px solid ${z.color}`,
                background: `${z.color}33`,
                outline: selected === z.key ? '2px dashed #111' : undefined,
              }}
            >
              <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium text-gray-900">
                {z.label}
              </span>
            </Rnd>
          ))}
      </div>

      <Button type="button" variant="outline" onClick={add}>Añadir zona</Button>

      {sel ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="zone-label">Nombre de la zona</Label>
            <Input id="zone-label" value={sel.label} maxLength={60} onChange={(e) => update(sel.key, { label: e.target.value })} />
          </div>
          <fieldset>
            <legend className="mb-1 text-sm">Color</legend>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${i + 1}`}
                  aria-pressed={sel.color === c}
                  onClick={() => update(sel.key, { color: c })}
                  className="h-8 w-8 rounded-full border-2"
                  style={{ background: c, borderColor: sel.color === c ? '#111' : 'transparent' }}
                />
              ))}
            </div>
          </fieldset>
          <Button type="button" variant="destructive" onClick={() => remove(sel.key)}>Eliminar zona</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Toca una zona para editarla. Arrástrala para moverla y usa los bordes para cambiar su tamaño.
        </p>
      )}
    </div>
  );
}
