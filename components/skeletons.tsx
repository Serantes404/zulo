import { Skeleton } from "@/components/ui/skeleton"

// Contenedor accesible: avisa a los lectores de pantalla de que se está cargando.
// Los bloques (Skeleton) ya son aria-hidden.
function Busy({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  )
}

/** Lista de grupos o de almacenes: 3 tarjetas de 72 px. */
export function ListSkeleton() {
  return (
    <Busy className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[72px] w-full" />
      ))}
    </Busy>
  )
}

/** Almacén (y editor de plano): barra de búsqueda + plano + 4 zonas. */
export function WarehouseSkeleton() {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <Busy className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Busy>
    </main>
  )
}

/** Página del grupo: título + 2 tarjetas + 3 filas de miembro. */
export function GroupSkeleton() {
  return (
    <Busy className="space-y-6">
      <Skeleton className="h-8 w-1/2" />
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </Busy>
  )
}

/** Fichas de material y de préstamo: título, líneas de texto y un bloque. */
export function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <Busy className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </Busy>
    </main>
  )
}
