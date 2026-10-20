import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { BottomNav } from '@/components/BottomNav';

export default function GroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Hueco para que la barra inferior (64 px + safe-area) no tape el contenido en móvil. */}
      <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
