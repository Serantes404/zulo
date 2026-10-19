'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZoneEditor } from '@/components/ZoneEditor';
import { PhotoCapture } from '@/components/PhotoCapture';
import { SketchPad } from '@/components/SketchPad';
import { Button } from '@/components/ui/button';
import { imageAspect, uploadPhoto } from '@/lib/photos';
import { fromDetected, type EditableZone } from '@/lib/zones';
import { DEFAULT_LAYOUT, MAX_ASPECT, MIN_ASPECT, type Layout, type PlanSource } from '@/lib/layout';
import type { DetectResult } from '@/lib/ai/detectZones';
import { detectZonesAction, previewPlanImage, saveZones } from './actions';

type Pending = { path: string; source: PlanSource };
const clampAspect = (a: number) => Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, a));

const AI_MESSAGES = {
  NO_ZONES: 'No he podido detectar zonas, dibújalas tú.',
  TIMEOUT: 'La IA ha tardado demasiado. Dibuja las zonas a mano o inténtalo de nuevo.',
  UNAVAILABLE: 'La IA no está disponible ahora. Puedes dibujar las zonas a mano.',
  TOO_LARGE: 'La imagen es demasiado grande (máx. 5 MB). Prueba con una más pequeña.',
  QUOTA: 'Has llegado al límite de detecciones con IA por hoy. Puedes dibujar las zonas a mano o volver a intentarlo mañana.',
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
  const [pending, setPending] = useState<Pending | null>(null); // imagen subida que aún no se ha guardado
  const [zones, setZones] = useState(initialZones);
  const [sketching, setSketching] = useState(false);
  const [uploadingSketch, setUploadingSketch] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const runId = useRef(0);
  const legacyGrid = initialZones.length > 0; // almacenes antiguos con zonas sobre cuadrícula

  // Sala vacía con muros cuando la IA no responde: la proporción debe poder guardarse.
  function fallbackLayout() {
    setLayout((l) => l ?? DEFAULT_LAYOUT);
    setAspect(clampAspect);
  }

  async function runDetection(src: PlanSource | null, pend?: Pending) {
    const id = ++runId.current;
    setDetecting(true);
    setMessage(null);
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
      if (r.layout && r.aspectRatio) {
        setLayout(r.layout);
        setAspect(r.aspectRatio);
      }
    } else {
      setMessage(AI_MESSAGES[r.reason]);
      if (src === 'sketch') fallbackLayout();
    }
  }

  function cancelDetection() {
    runId.current++;
    setDetecting(false);
    if (source === 'sketch') fallbackLayout();
    setMessage('Detección cancelada. Puedes dibujar las zonas a mano.');
  }

  async function onPlanUploaded(path: string, file: File, src: PlanSource) {
    const ratio = await imageAspect(file);
    const r = await previewPlanImage(groupId, warehouseId, path, ratio, src);
    if ('error' in r) {
      setMessage(r.error);
      return;
    }
    setImageUrl(r.url);
    setAspect(ratio);
    setSource(src);
    setLayout(null);
    const pend = { path, source: src };
    setPending(pend);
    if (src === 'sketch' || zones.length === 0) await runDetection(src, pend);
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
    await runDetection(source, pending ?? undefined);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const r = await saveZones(groupId, warehouseId, zones, pending || layout ? { layout, aspectRatio: aspect, image: pending ?? undefined } : undefined);
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
