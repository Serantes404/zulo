'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CONDITION_LABEL, type ReturnCondition } from '@/lib/loans';
import { returnAction } from './actions';

export function ReturnForm({ loanId, groupId }: { loanId: string; groupId: string }) {
  const router = useRouter();
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [condition, setCondition] = useState<ReturnCondition>('ok');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoPath) {
      setError('Haz una foto del material al devolverlo.');
      return;
    }
    setPending(true);
    setError(null);
    const r = await returnAction({ loanId, photoPath, condition, notes });
    setPending(false);
    if (r && 'error' in r) {
      setError(r.error);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2">
      <PhotoCapture groupId={groupId} kind="loans" label="Foto al devolver (obligatoria)" onUploaded={(p) => setPhotoPath(p)} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium">¿En qué estado vuelve?</legend>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(CONDITION_LABEL) as ReturnCondition[]).map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm">
              <input type="radio" name={`cond-${loanId}`} value={c} checked={condition === c} onChange={() => setCondition(c)} />
              {CONDITION_LABEL[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor={`notes-${loanId}`}>Notas (opcional)</Label>
        <Textarea id={`notes-${loanId}`} maxLength={500} placeholder="Falta una piqueta" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={pending || !photoPath}>{pending ? 'Registrando…' : 'Devolver'}</Button>
    </form>
  );
}
