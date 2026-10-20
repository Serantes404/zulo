import { CircleAlert } from "lucide-react"

type FormErrorProps = {
  /** Id para que el input lo referencie con `aria-describedby`. */
  id: string
  children?: React.ReactNode
}

export function FormError({ id, children }: FormErrorProps) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
