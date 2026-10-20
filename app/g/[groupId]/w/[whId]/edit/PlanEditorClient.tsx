'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, LayoutGrid, Loader2, Plus, RefreshCw, Sparkles, TriangleAlert, X } from 'lucide-react';
import { cn } from 'cn';
import { ZoneDetails, ZoneEditor } from '@/components/ZoneEditor';
import { PhotoCapture } from '@/components/PhotoCapture';
import { SketchPad, type SketchPadHandle } from '@/components/SketchPad';
import { FormError } from '@/components/FormError';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/toaster';
import { imageAspect, uploadPhoto } from '@/lib/photos';
import { fromDetected, newZone, type EditableZone } from '@/lib/zones';
import { DEFAULT_LAYOUT, MAX_ASPECT, MIN_ASPECT, type Layout, type PlanSource } from '@/lib/layout';
import { EDITOR_STEPS, editorStep, stepState, type EditorStep } from '@/lib/planEditorSteps';
import type { DetectResult } from '@/lib/ai/detectZones';
import { detectZonesAction, previewPlanImage, saveZones } from './actions';

type Pending = { path: string; source: PlanSource };
type AiReason = keyof typeof AI_MESSAGES;
type Confirm = 'redraw' | 'redetect' | 'exit';
const clampAspect = (a: number) => Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, a));

const AI_MESSAGES = {
  NO_ZONES: 'No he podido detectar zonas, dibújalas tú.',
  TIMEOUT: 'La IA ha tardado demasiado. Dibuja las zonas a mano o inténtalo de nuevo.',
  UNAVAILABLE: 'La IA no está disponible ahora. Puedes dibujar las zonas a mano.',
  TOO_LARGE: 'La imagen es demasiado grande (máx. 5 MB). Prueba con una más pequeña.',
  QUOTA: 'Has llegado al límite de detecciones con IA por hoy. Puedes dibujar las zonas a mano o volver a intentarlo mañana.',
} as const;
// Reintentar no sirve con una imagen demasiado grande ni sin cuota.
const RETRYABLE: AiReason[] = ['NO_ZONES', 'TIMEOUT', 'UNAVAILABLE'];

const CONFIRMS: Record<Confirm, { title: string; body: string; action: string }> = {
  redraw: {
    title: '¿Dibujar el plano de nuevo?',
    body: 'Cuando termines, la IA reemplazará las zonas actuales por las que detecte.',
    action: 'Redibujar',
  },
  redetect: {
    title: '¿Volver a detectar las zonas?',
    body: 'Las zonas actuales se reemplazan por las que detecte la IA.',
    action: 'Volver a detectar',
  },
  exit: {
    title: '¿Salir sin guardar?',
    body: 'Los cambios del plano se pierden. No se puede deshacer.',
    action: 'Salir sin guardar',
  },
};

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
  const toast = useToast();
  const errorId = useId();
  const kindLegendId = useId();
  const legacyGrid = initialZones.length > 0; // almacenes antiguos con zonas sobre cuadrícula
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [aspect, setAspect] = useState(aspectRatio);
  const [source, setSource] = useState<PlanSource | null>(planSource);
  const [layout, setLayout] = useState<Layout | null>(initialLayout);
  const [uploadKind, setUploadKind] = useState<PlanSource>('sketch');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null); // imagen subida que aún no se ha guardado
  const [zones, setZones] = useState(initialZones);
  const [selected, setSelected] = useState<string | null>(null);
  // Sin plano se empieza directamente en el lienzo (paso 1).
  const [sketching, setSketching] = useState(initialUrl === null && !legacyGrid);
  const [sketchEmpty, setSketchEmpty] = useState(true);
  const [uploadingSketch, setUploadingSketch] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectStartedAt, setDetectStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<AiReason | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const runId = useRef(0);
  const sketchRef = useRef<SketchPadHandle>(null);

  // `manual`: zonas a mano sin imagen ni boceto (alternativa de teclado al lienzo, WCAG 2.1.1).
  // Se guarda como los almacenes antiguos sobre cuadrícula: saveZones sin `plan`, solo zonas.
  const [manual, setManual] = useState(false);
  const showEditor = imageUrl !== null || legacyGrid || manual;
  const step = editorStep({ sketching, detecting, saving, hasPlan: showEditor });
  const dirty = pending !== null || zones !== initialZones || (sketching && !sketchEmpty);
  const sel = zones.find((z) => z.key === selected);
  const elapsed = Math.max(0, Math.round((now - detectStartedAt) / 1000));

  // Contador para la variante sin movimiento ("Detectando… 3 s").
  useEffect(() => {
    if (!detecting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [detecting]);

  // Sala vacía con muros cuando la IA no responde: la proporción debe poder guardarse.
  function fallbackLayout() {
    setLayout((l) => l ?? DEFAULT_LAYOUT);
    setAspect(clampAspect);
  }

  async function runDetection(src: PlanSource | null, pend?: Pending) {
    const id = ++runId.current;
    const start = Date.now();
    setDetectStartedAt(start);
    setNow(start);
    setDetecting(true);
    setError(null);
    setAiWarning(null);
    let r: DetectResult;
    try {
      r = await detectZonesAction(groupId, warehouseId, pend);
    } catch {
      r = { ok: false as const, reason: 'UNAVAILABLE' as const };
    }
    if (id !== runId.current) return; // se canceló mientras esperaba
    setDetecting(false);
    if (r.ok) {
      setZones(fromDetected(r.zones));
      setSelected(null);
      if (r.layout && r.aspectRatio) {
        setLayout(r.layout);
        setAspect(r.aspectRatio);
      }
    } else {
      setAiWarning(r.reason);
      if (src === 'sketch') fallbackLayout();
    }
  }

  function cancelDetection() {
    runId.current++;
    setDetecting(false);
    if (source === 'sketch') fallbackLayout();
    toast({ title: 'Detección cancelada', description: 'Puedes dibujar las zonas a mano.' });
  }

  async function onPlanUploaded(path: string, file: File, src: PlanSource) {
    const ratio = await imageAspect(file);
    const r = await previewPlanImage(groupId, warehouseId, path, ratio, src);
    if ('error' in r) {
      setError(r.error);
      return;
    }
    setImageUrl(r.url);
    setAspect(ratio);
    setSource(src);
    setLayout(null);
    setSketching(false);
    const pend = { path, source: src };
    setPending(pend);
    if (src === 'sketch' || zones.length === 0) await runDetection(src, pend);
  }

  async function onSketchDone(file: File) {
    setUploadingSketch(true);
    setError(null);
    let path: string;
    try {
      path = await uploadPhoto(file, groupId, 'plans');
    } catch (err) {
      console.error('uploadSketch', err);
      setError('No se ha podido subir el dibujo. Inténtalo de nuevo.');
      setUploadingSketch(false);
      return;
    }
    setUploadingSketch(false);
    setSketching(false);
    await onPlanUploaded(path, file, 'sketch');
  }

  function redraw() {
    if (zones.length > 0) setConfirm('redraw');
    else setSketching(true);
  }

  async function redetect() {
    if (zones.length > 0) setConfirm('redetect');
    else await runDetection(source, pending ?? undefined);
  }

  function exit() {
    if (dirty) setConfirm('exit');
    else router.push(`/g/${groupId}/w/${warehouseId}`);
  }

  function onConfirm(kind: Confirm) {
    if (kind === 'redraw') setSketching(true);
    else if (kind === 'redetect') void runDetection(source, pending ?? undefined);
    else router.push(`/g/${groupId}/w/${warehouseId}`);
  }

  function addZone() {
    const z = newZone(zones.length);
    setZones([...zones, z]);
    setSelected(z.key);
  }

  function startManual() {
    setManual(true);
    setSketching(false);
    if (zones.length === 0) addZone();
  }

  function drawByHand() {
    setAiWarning(null);
    if (zones.length === 0) addZone();
  }

  function updateZone(key: string, patch: Partial<EditableZone>) {
    setZones((zs) => zs.map((z) => (z.key === key ? { ...z, ...patch } : z)));
  }

  function removeZone(key: string) {
    setZones((zs) => zs.filter((z) => z.key !== key));
    setSelected(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const r = await saveZones(groupId, warehouseId, zones, pending || layout ? { layout, aspectRatio: aspect, image: pending ?? undefined } : undefined);
    if ('error' in r) {
      setSaving(false);
      setError(r.error);
      return;
    }
    toast({ title: 'Plano guardado' });
    router.push(`/g/${groupId}/w/${warehouseId}`);
  }

  const zoneCount = `${zones.length} ${zones.length === 1 ? 'zona' : 'zonas'}`;
  const overline = 'font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase';

  return (
    // pb: en móvil el layout del grupo ya reserva 4rem + safe-area (la barra inferior está oculta aquí),
    // que con pb-6 cubre la barra de acción fija; en md no hay ese hueco; en lg la barra no es fija.
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6 md:pb-24 lg:pb-8">
      <header className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Salir del editor" onClick={exit} className="-ml-2" />}>
            <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
          </TooltipTrigger>
          <TooltipContent>Salir del editor</TooltipContent>
        </Tooltip>
        <h1 className="min-w-0 truncate text-[22px] leading-7 font-semibold md:text-[28px] md:leading-[34px]">Plano de {name}</h1>
      </header>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        {/* Pasos + texto del paso (arriba en móvil; columna derecha en escritorio). */}
        <div className="space-y-4 lg:col-start-2 lg:row-start-1">
          <Stepper current={step} />

          {step === 'draw' && (
            <div className="space-y-1">
              <p className={overline}>Dibujar</p>
              <p>Dibuja el almacén visto desde arriba: paredes, estanterías, armarios, montones… Los nombres se ponen después.</p>
            </div>
          )}
          {(step === 'refine' || step === 'save') && <p className={overline}>Retocar · {zoneCount}</p>}

          {/* Región viva siempre montada: así se anuncian el estado de la IA y sus avisos. */}
          <div role="status" aria-live="polite" className="space-y-3 empty:hidden">
            {step === 'detect' && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <Sparkles aria-hidden="true" strokeWidth={1.75} className="size-5 text-primary" />
                  Detectando zonas…
                </p>
                <p className="text-sm text-muted-foreground">Suele tardar menos de 10 segundos.</p>
              </div>
            )}
            {aiWarning && !detecting && (
              <div className="space-y-3 rounded-lg border border-warning-foreground/20 bg-warning p-3 text-warning-foreground">
                <p className="flex items-start gap-2 text-sm">
                  <TriangleAlert aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
                  <span>{AI_MESSAGES[aiWarning]}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {showEditor && !sketching && (
                    <Button variant="outline" onClick={drawByHand}>
                      Dibujar zonas a mano
                    </Button>
                  )}
                  {RETRYABLE.includes(aiWarning) && imageUrl && (
                    <Button variant="outline" onClick={redetect}>
                      <RefreshCw aria-hidden="true" strokeWidth={1.75} className="size-5" />
                      Reintentar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {step === 'detect' && (
            <div className="space-y-3">
              {/* Sin movimiento: spinner estático con los segundos (fuera de la región viva para no anunciarlos cada segundo). */}
              <p aria-hidden="true" className="hidden items-center gap-2 text-sm text-muted-foreground motion-reduce:flex">
                <Loader2 className="size-4" />
                Detectando… {elapsed} s
              </p>
              <Button variant="outline" onClick={cancelDetection}>
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Zona de trabajo: lienzo, IA o plano con zonas (columna izquierda en escritorio). */}
        <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {step === 'draw' && (
            <>
              <SketchPad ref={sketchRef} busy={uploadingSketch} onDone={onSketchDone} onEmptyChange={setSketchEmpty} />
              {showEditor && (
                <Button variant="ghost" onClick={() => setSketching(false)} disabled={uploadingSketch}>
                  Cancelar y volver al plano
                </Button>
              )}
            </>
          )}

          {step === 'detect' && (
            <div
              className="relative w-full overflow-hidden rounded-lg border border-input bg-white"
              style={{ aspectRatio: String(aspect) }}
            >
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase
                <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-fill opacity-40" />
              )}
              <div aria-hidden="true" className="plan-scan" />
            </div>
          )}

          {(step === 'refine' || step === 'save') && (
            <>
              <ZoneEditor
                imageUrl={imageUrl}
                layout={layout}
                aspectRatio={aspect}
                zones={zones}
                onChange={setZones}
                selected={selected}
                onSelect={setSelected}
              />
              <div className="flex flex-wrap items-start gap-2">
                <Button variant="outline" onClick={addZone}>
                  <Plus aria-hidden="true" strokeWidth={1.75} className="size-5" />
                  Zona
                </Button>
                {source === 'sketch' && (
                  <Button variant="ghost" onClick={redraw}>
                    <RefreshCw aria-hidden="true" strokeWidth={1.75} className="size-5" />
                    Redibujar
                  </Button>
                )}
                {imageUrl ? (
                  <Button variant="ghost" onClick={redetect}>
                    <Sparkles aria-hidden="true" strokeWidth={1.75} className="size-5" />
                    Volver a detectar
                  </Button>
                ) : (
                  <PhotoCapture
                    groupId={groupId}
                    kind="plans"
                    label="Añadir foto de fondo"
                    onUploaded={(path, file) => onPlanUploaded(path, file, 'photo')}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Panel: alternativa de subida, zona elegida y barra de acción. */}
        <div className="space-y-4 lg:col-start-2 lg:row-start-2">
          {step === 'draw' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {showEditor ? '¿Ya tienes un boceto o una foto?' : '¿No puedes dibujar? Sube una imagen o crea las zonas a mano.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setUploadOpen(true)} disabled={uploadingSketch}>
                  <Camera aria-hidden="true" strokeWidth={1.75} className="size-5" />
                  Subir imagen
                </Button>
                {!showEditor && (
                  <Button variant="ghost" onClick={startManual} disabled={uploadingSketch}>
                    <LayoutGrid aria-hidden="true" strokeWidth={1.75} className="size-5" />
                    Crear las zonas a mano
                  </Button>
                )}
              </div>
            </div>
          )}

          {(step === 'refine' || step === 'save') &&
            (sel ? (
              <ZoneDetails zone={sel} onUpdate={(patch) => updateZone(sel.key, patch)} onRemove={() => removeZone(sel.key)} />
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Elige una zona en el plano para cambiar su nombre, su color, su posición o su tamaño.
              </p>
            ))}

          {step !== 'detect' && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="mx-auto max-w-6xl space-y-2">
                <FormError id={errorId}>{error}</FormError>
                {step === 'draw' ? (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => sketchRef.current?.done()}
                    disabled={uploadingSketch || sketchEmpty}
                    aria-describedby={error ? errorId : undefined}
                  >
                    {uploadingSketch ? (
                      <Loader2 aria-hidden="true" className="size-5 animate-spin" />
                    ) : (
                      <Sparkles aria-hidden="true" strokeWidth={1.75} className="size-5" />
                    )}
                    {uploadingSketch ? 'Subiendo…' : 'Listo, detectar zonas'}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" onClick={save} disabled={saving} aria-describedby={error ? errorId : undefined}>
                    {saving && <Loader2 aria-hidden="true" className="size-5 animate-spin" />}
                    {saving ? 'Guardando…' : 'Guardar plano'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Es una foto o un boceto?</DialogTitle>
            <DialogDescription>Así la IA sabe qué hacer con la imagen.</DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend id={kindLegendId} className="mb-2 text-sm font-medium">
              Tipo de imagen
            </legend>
            <RadioGroup
              aria-labelledby={kindLegendId}
              value={uploadKind}
              onValueChange={(v) => setUploadKind(v as PlanSource)}
            >
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-checked]]:border-primary">
                <RadioGroupItem value="sketch" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Boceto en planta</span>
                  <span className="block text-sm text-muted-foreground">Un dibujo visto desde arriba. La IA crea un plano limpio con sus zonas.</span>
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-checked]]:border-primary">
                <RadioGroupItem value="photo" className="mt-0.5" />
                <span>
                  <span className="block font-medium">Foto del almacén</span>
                  <span className="block text-sm text-muted-foreground">Se usa de fondo y la IA marca las zonas encima.</span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>
          <PhotoCapture
            groupId={groupId}
            kind="plans"
            label={uploadKind === 'sketch' ? 'Elegir boceto' : 'Elegir foto'}
            onUploaded={async (path, file) => {
              setUploadOpen(false);
              await onPlanUploaded(path, file, uploadKind);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{CONFIRMS[confirm].title}</AlertDialogTitle>
                <AlertDialogDescription>{CONFIRMS[confirm].body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onConfirm(confirm)}>{CONFIRMS[confirm].action}</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Stepper({ current }: { current: EditorStep }) {
  return (
    <nav aria-label="Pasos">
      <ol className="grid grid-cols-4">
        {EDITOR_STEPS.map((s, i) => {
          const state = stepState(s.id, current);
          return (
            <li key={s.id} aria-current={state === 'current' ? 'step' : undefined} className="relative flex flex-col items-center gap-1 text-center">
              {i < EDITOR_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3 right-[calc(-50%+16px)] left-[calc(50%+16px)] h-0.5 rounded-full',
                    state === 'done' ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-6 items-center justify-center rounded-full font-mono text-xs font-semibold',
                  state === 'current' && 'bg-primary text-primary-foreground',
                  state === 'done' && 'bg-accent text-accent-foreground',
                  state === 'upcoming' && 'border border-input text-muted-foreground',
                )}
              >
                {state === 'done' ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  'font-mono text-xs tracking-[0.12em] uppercase',
                  state === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
                {state === 'done' && <span className="sr-only"> (hecho)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
