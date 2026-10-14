'use client';
import { useId, useState } from 'react';
import { uploadPhoto } from '@/lib/photos';
import type { PhotoKind } from '@/lib/photoPath';

type Props = {
  groupId: string;
  kind: PhotoKind;
  label: string;
  onUploaded: (path: string, file: File) => void | Promise<void>;
};

export function PhotoCapture({ groupId, kind, label, onUploaded }: Props) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    let path: string;
    try {
      path = await uploadPhoto(file, groupId, kind);
    } catch {
      setError('No se ha podido subir la foto. Inténtalo de nuevo.');
      setUploading(false);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(false);
    await onUploaded(path, file);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        {uploading ? 'Subiendo…' : label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={kind === 'plans' ? undefined : 'environment'}
        className="sr-only"
        onChange={onChange}
        disabled={uploading}
      />
      {kind !== 'plans' && <p className="text-xs text-muted-foreground">Haz la foto al material, no a personas.</p>}
      {preview && <img src={preview} alt="Vista previa de la foto subida" className="max-h-48 rounded-md border" />}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
