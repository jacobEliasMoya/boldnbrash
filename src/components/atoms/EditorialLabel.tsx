import type { ReactNode } from 'react'

export function EditorialLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[clamp(0.65rem,1.2vw,0.875rem)] tracking-[0.13em] uppercase">
      {children}
    </span>
  )
}
