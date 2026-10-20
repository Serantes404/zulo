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
          <rect width="40" height="40" style={{ fill: 'var(--plan-paper)' }} />
          <path d="M40 0H0V40" fill="none" style={{ stroke: 'var(--plan-grid)' }} strokeWidth="1.5" />
        </pattern>
        <pattern id={`hatch-${id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" style={{ fill: 'var(--plan-paper)' }} />
          <line x1="0" y1="0" x2="0" y2="10" style={{ stroke: 'var(--plan-ink)' }} strokeWidth="4" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#tile-${id})`} />

      {layout.corridors.map((c, i) => {
        const cx = (c.x + c.w / 2) * W;
        const cy = (c.y + c.h / 2) * H;
        const vertical = c.h * H > c.w * W;
        return (
          <g key={`c${i}`}>
            <rect x={c.x * W} y={c.y * H} width={c.w * W} height={c.h * H} fill="none" style={{ stroke: 'var(--plan-line)' }} strokeWidth="2" strokeDasharray="10 10" />
            <text
              x={cx}
              y={cy}
              fontSize="22"
              letterSpacing="8"
              style={{ fill: 'var(--plan-label)', fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
            >
              {(c.label || 'Pasillo').toUpperCase()}
            </text>
          </g>
        );
      })}

      {WALLS.flatMap((wall) =>
        wallSegments(wall, layout.doors).map((seg, i) => (
          <rect key={`${wall}${i}`} {...wallRect(wall, seg)} fill={`url(#hatch-${id})`} style={{ stroke: 'var(--plan-ink)' }} strokeWidth="2" />
        )),
      )}

      {layout.doors.map((d, i) => {
        const s = doorSwing(d, W, H);
        return (
          <g key={`d${i}`}>
            <line x1={s.hinge.x} y1={s.hinge.y} x2={s.leafEnd.x} y2={s.leafEnd.y} style={{ stroke: 'var(--plan-ink)' }} strokeWidth="4" />
            <path
              d={`M ${s.leafEnd.x} ${s.leafEnd.y} A ${s.radius} ${s.radius} 0 0 ${s.sweep} ${s.arcEnd.x} ${s.arcEnd.y}`}
              fill="none"
              style={{ stroke: 'var(--plan-ink)' }}
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
          </g>
        );
      })}
    </svg>
  );
}
