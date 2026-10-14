'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZoneEditor } from '@/components/ZoneEditor';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button } from '@/components/ui/button';
import { imageAspect } from '@/lib/photos';
import { fromDetected, type EditableZone } from '@/lib/zones';
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
  initialZones: EditableZone[];
};

export function PlanEditorClient({ groupId, warehouseId, name, imageUrl: initialUrl, aspectRatio, initialZones }: Props) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [aspect, setAspect] = useState(aspectRatio);
  const [zones, setZones] = useState(initialZones);
  const [manual, setManual] = useState(initialZones.length > 0);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const runId = useRef(0);

  async function runDetection() {
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
    if (r.ok) setZones(fromDetected(r.zones));
    else setMessage(AI_MESSAGES[r.reason]);
  }

  function cancelDetection() {
    runId.current++;
    setDetecting(false);
    setMessage('Detección cancelada. Puedes dibujar las zonas a mano.');
  }

  async function onPlanUploaded(path: string, file: File) {
    const ratio = await imageAspect(file);
    const r = await setPlanImage(groupId, warehouseId, path, ratio);
    if ('error' in r) {
      setMessage(r.error);
      return;
    }
    setImageUrl(r.url);
    setAspect(ratio);
    setManual(true);
    if (zones.length === 0) await runDetection();
  }

  async function redetect() {
    if (zones.length > 0 && !confirm('Esto reemplaza las zonas actuales por las que detecte la IA. ¿Seguir?')) return;
    await runDetection();
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const r = await saveZones(groupId, warehouseId, zones);
    setSaving(false);
    if ('error' in r) setMessage(r.error);
    else router.push(`/g/${groupId}/w/${warehouseId}`);
  }

  const showEditor = imageUrl !== null || manual;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Plano de {name}</h1>

      {!showEditor && (
        <div className="space-y-3">
          <p>Sube una foto o un boceto del almacén y la IA propondrá las zonas.</p>
          <PhotoCapture groupId={groupId} kind="plans" label="Subir foto o boceto" onUploaded={onPlanUploaded} />
          <Button variant="outline" onClick={() => setManual(true)}>Dibujar a mano sobre cuadrícula</Button>
        </div>
      )}

      {detecting && (
        <div role="status" className="flex items-center gap-3 rounded-lg border p-3">
          <span>Detectando zonas… puede tardar hasta un minuto.</span>
          <Button variant="outline" size="sm" onClick={cancelDetection}>Cancelar</Button>
        </div>
      )}

      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}

      {showEditor && !detecting && (
        <>
          <ZoneEditor imageUrl={imageUrl} aspectRatio={aspect} zones={zones} onChange={setZones} />
          <div className="flex flex-wrap items-start gap-2">
            {imageUrl ? (
              <Button variant="outline" onClick={redetect}>Volver a detectar con IA</Button>
            ) : (
              <PhotoCapture groupId={groupId} kind="plans" label="Añadir foto de fondo" onUploaded={onPlanUploaded} />
            )}
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar plano'}</Button>
          </div>
        </>
      )}
    </main>
  );
}
