'use client';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { extendStroke, isEmpty, startStroke, undo, type Sketch } from '@/lib/sketch';

// Resolución interna fija (4:3): el PNG exportado tiene siempre este tamaño, sea cual sea la pantalla.
const W = 1600;
const H = 1200;
const LINE = 8;

// Puntos guía: solo una capa CSS encima del lienzo (pointer-events: none). Nunca se pintan en el canvas,
// así el PNG que recibe la IA sale limpio. 20 × 15 celdas = la misma proporción 4:3 que el lienzo.
const GUIDE_DOTS: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgb(20 22 31 / 0.28) 1.5px, transparent 2px)',
  backgroundSize: 'calc(100% / 20) calc(100% / 15)',
};

/** El botón "Listo, detectar zonas" vive en la barra de acción fija del editor y llama a `done()`. */
export type SketchPadHandle = { done: () => void };

type Props = {
  busy?: boolean;
  onDone: (file: File) => void | Promise<void>;
  onEmptyChange?: (empty: boolean) => void;
  ref?: Ref<SketchPadHandle>;
};

export function SketchPad({ busy = false, onDone, onEmptyChange, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [sketch, setSketch] = useState<Sketch>([]);
  const [confirmClear, setConfirmClear] = useState(false);

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

  const empty = isEmpty(sketch);
  useEffect(() => onEmptyChange?.(empty), [empty, onEmptyChange]);

  function done() {
    canvasRef.current?.toBlob((blob) => {
      if (blob) void onDone(new File([blob], 'boceto.png', { type: 'image/png' }));
    }, 'image/png');
  }

  useImperativeHandle(ref, () => ({ done }));

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-input">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          role="img"
          aria-label="Lienzo para dibujar el plano del almacén"
          className="block aspect-[4/3] w-full touch-none bg-white"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stop}
          onPointerCancel={stop}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={GUIDE_DOTS} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setSketch(undo)} disabled={busy || empty}>
          <Undo2 aria-hidden="true" strokeWidth={1.75} className="size-5" />
          Deshacer
        </Button>
        <Button variant="outline" onClick={() => setConfirmClear(true)} disabled={busy || empty}>
          <Eraser aria-hidden="true" strokeWidth={1.75} className="size-5" />
          Borrar todo
        </Button>
      </div>
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar todo el dibujo?</AlertDialogTitle>
            <AlertDialogDescription>Se borran todos los trazos. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setSketch([])}>Borrar dibujo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
