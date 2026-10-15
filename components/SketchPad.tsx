'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { extendStroke, isEmpty, startStroke, undo, type Sketch } from '@/lib/sketch';

// Resolución interna fija (4:3): el PNG exportado tiene siempre este tamaño, sea cual sea la pantalla.
const W = 1600;
const H = 1200;
const LINE = 8;

type Props = {
  busy?: boolean;
  onDone: (file: File) => void | Promise<void>;
};

export function SketchPad({ busy = false, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [sketch, setSketch] = useState<Sketch>([]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineWidth = LINE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of sketch) {
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x * W, stroke[0].y * H, LINE / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * W, p.y * H) : ctx.lineTo(p.x * W, p.y * H)));
      ctx.stroke();
    }
  }, [sketch]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e); // fuera del updater: React lo ejecuta después y e.currentTarget ya es null
    setSketch((s) => startStroke(s, p));
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = point(e);
    setSketch((s) => extendStroke(s, p));
  }

  function stop() {
    drawing.current = false;
  }

  function clear() {
    if (confirm('¿Borrar todo el dibujo?')) setSketch([]);
  }

  function done() {
    canvasRef.current?.toBlob((blob) => {
      if (blob) void onDone(new File([blob], 'boceto.png', { type: 'image/png' }));
    }, 'image/png');
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Dibuja el almacén visto desde arriba: paredes, estanterías, armarios, montones… Los nombres se ponen después.
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label="Lienzo para dibujar el plano del almacén"
        className="aspect-[4/3] w-full touch-none rounded-lg border bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setSketch(undo)} disabled={busy || isEmpty(sketch)}>
          Deshacer
        </Button>
        <Button variant="outline" onClick={clear} disabled={busy || isEmpty(sketch)}>
          Borrar todo
        </Button>
        <Button onClick={done} disabled={busy || isEmpty(sketch)}>
          {busy ? 'Subiendo…' : 'Listo, detectar zonas'}
        </Button>
      </div>
    </div>
  );
}
