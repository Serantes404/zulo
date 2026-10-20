'use client';
import { useId, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from 'cn';
import { buttonVariants } from '@/components/ui/button';
import { FormError } from '@/components/FormError';
import { uploadPhoto } from '@/lib/photos';
import { toBrowserImage } from '@/lib/heic';
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
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    setUploading(true);
    setError(null);
    let file: File;
    let path: string;
    try {
      file = await toBrowserImage(original);
      path = await uploadPhoto(file, groupId, kind);
    } catch (err) {
      console.error('uploadPhoto', err);
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
      {/* El input va antes que la etiqueta para que esta muestre el foco (peer-focus-visible). */}
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={kind === 'plans' ? undefined : 'environment'}
        className="peer sr-only"
        onChange={onChange}
        disabled={uploading}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'cursor-pointer peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:pointer-events-none peer-disabled:opacity-50',
        )}
      >
        {uploading ? (
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        ) : (
          <Camera aria-hidden="true" strokeWidth={1.75} className="size-5" />
        )}
        {uploading ? 'Subiendo…' : label}
      </label>
      {kind !== 'plans' && <p className="text-xs text-muted-foreground">Haz la foto al material, no a personas.</p>}
      {preview && <img src={preview} alt="Vista previa de la foto subida" className="max-h-48 rounded-lg border" />}
      <FormError id={`${id}-error`}>{error}</FormError>
    </div>
  );
}
