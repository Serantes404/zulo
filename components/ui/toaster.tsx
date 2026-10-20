"use client"

import * as React from "react"
import { Toast } from "@base-ui/react/toast"
import { X } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"

const TOAST_DURATION_MS = 4000

type ToastOptions = {
  title: string
  description?: string
  /** "error" usa role="alert"; el resto, role="status". */
  variant?: "default" | "error"
}

function ToastList() {
  const { toasts } = Toast.useToastManager<{ variant?: "default" | "error" }>()
  return toasts.map((toast) => {
    const isError = toast.data?.variant === "error"
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        role={isError ? "alert" : "status"}
        className={cn(
          "pointer-events-auto flex w-full items-center gap-2 rounded-lg border bg-popover py-2 pr-2 pl-4 text-popover-foreground shadow-md",
          "transition-[opacity,translate] duration-(--dur-slow) ease-(--ease-zulo)",
          "data-starting-style:translate-y-3 data-starting-style:opacity-0",
          "data-ending-style:translate-y-3 data-ending-style:opacity-0",
          isError && "border-destructive/40"
        )}
      >
        <div className="min-w-0 flex-1">
          <Toast.Title
            className={cn("text-sm font-medium", isError && "text-destructive")}
          />
          <Toast.Description className="text-sm text-muted-foreground" />
        </div>
        <Toast.Close
          render={<Button variant="ghost" size="icon" aria-label="Cerrar" />}
        >
          <X aria-hidden strokeWidth={1.75} className="size-5" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}

/** Proveedor + viewport. Se monta una vez en app/layout.tsx. */
export function Toaster({ children }: { children?: React.ReactNode }) {
  return (
    <Toast.Provider timeout={TOAST_DURATION_MS} limit={3}>
      {children}
      <Toast.Viewport
        aria-label="Notificaciones"
        className={cn(
          "pointer-events-none fixed z-50 flex flex-col gap-2 outline-none",
          // Móvil: centrado, encima de la barra inferior (64 px) y del safe area.
          "inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4rem+0.75rem)]",
          // Escritorio: abajo a la derecha, sin barra inferior.
          "md:inset-x-auto md:right-4 md:bottom-4 md:w-96"
        )}
      >
        <ToastList />
      </Toast.Viewport>
    </Toast.Provider>
  )
}

/** `const toast = useToast(); toast({ title: "Link copiado" })` */
export function useToast() {
  const { add } = Toast.useToastManager()
  return React.useCallback(
    ({ title, description, variant = "default" }: ToastOptions) =>
      add({ title, description, data: { variant } }),
    [add]
  )
}
