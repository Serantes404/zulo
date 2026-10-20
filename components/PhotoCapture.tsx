'use client';
import { useId, useState } from 'react';
import { Camera, Check, Loader2 } from 'lucide-react';
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
  /** 'zone': zona de cámara grande 4:3 (coger/devolver). 'button': botón compacto. */
  variant?: 'zone' | 'button';
  onUploaded: (path: string, file: File) => void | Promise<void>;
};

export function PhotoCapture({ groupId, kind, label, variant = 'button', onUploaded }: Props) {
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

  const focusRing =
    'peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background';
  const note = kind !== 'plans' && <p className="text-xs text-muted-foreground">Haz la foto al material, no a personas.</p>;

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
      {variant === 'zone' ? (
        preview && !uploading ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa de la foto subida" className="size-20 shrink-0 rounded-md border object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-success-ink">
                <Check aria-hidden="true" className="size-4" /> Foto subida
              </p>
            </div>
            <label
              htmlFor={id}
              className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer', focusRing)}
            >
              Repetir
            </label>
          </div>
        ) : (
          <label
            htmlFor={id}
            className={cn(
              'flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 p-4 text-center transition-colors hover:bg-muted peer-disabled:pointer-events-none peer-disabled:opacity-50',
              focusRing,
            )}
          >
            {uploading ? (
              <Loader2 aria-hidden="true" className="size-10 animate-spin text-muted-foreground" />
            ) : (
              <Camera aria-hidden="true" strokeWidth={1.75} className="size-10 text-muted-foreground" />
            )}
            <span className="text-base font-medium">{uploading ? 'Subiendo…' : label}</span>
            {!uploading && kind !== 'plans' && <span className="text-sm text-muted-foreground">(no a personas)</span>}
          </label>
        )
      ) : (
        <>
          <label
            htmlFor={id}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'cursor-pointer peer-disabled:pointer-events-none peer-disabled:opacity-50',
              focusRing,
            )}
          >
            {uploading ? (
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            ) : (
              <Camera aria-hidden="true" strokeWidth={1.75} className="size-5" />
            )}
            {uploading ? 'Subiendo…' : label}
          </label>
          {note}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Vista previa de la foto subida" className="max-h-48 rounded-lg border" />}
        </>
      )}
      <FormError id={`${id}-error`}>{error}</FormError>
    </div>
  );
}
