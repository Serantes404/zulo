import type { LucideIcon } from "lucide-react"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  /** Nivel del título: h1 en páginas de error/404 que no tienen otro h1. */
  as?: 'h1' | 'h2'
}

export function EmptyState({ icon: Icon, title, description, action, as: Heading = 'h2' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <Icon className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <Heading className="text-lg font-semibold">{title}</Heading>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
