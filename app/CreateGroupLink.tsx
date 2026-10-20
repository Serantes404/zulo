'use client';
import Link from 'next/link';
import { onCreateGroupClick } from '@/lib/focusCreateGroup';

/** Enlace "Crear grupo" de la portada: enfoca el campo del formulario aunque ya sea visible. */
export function CreateGroupLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link href="/app#crear" className={className} onClick={onCreateGroupClick}>
      {children}
    </Link>
  );
}
