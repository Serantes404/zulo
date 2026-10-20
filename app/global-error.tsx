'use client';
import { useEffect } from 'react';

// Sustituye al layout raíz cuando este falla: sin Tailwind ni componentes, solo estilos en línea.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const button = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '0 20px',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
  } as const;
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        <title>Algo ha salido mal</title>
        <main style={{ maxWidth: 384, margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Algo ha salido mal</h1>
          <p style={{ margin: '0 0 24px', color: '#555', fontSize: 14 }}>
            No hemos podido cargar la aplicación. Inténtalo de nuevo.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            <button type="button" onClick={() => retry()} style={{ ...button, border: '1px solid #111', background: '#111', color: '#fff' }}>
              Reintentar
            </button>
            {/* Enlace nativo: el router de Next puede no estar disponible si falló el layout raíz. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...button, border: '1px solid #bbb', color: '#111' }}>
              Volver a mis grupos
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
