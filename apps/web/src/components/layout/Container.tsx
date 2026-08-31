import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Missing shared primitive found while verifying an unrelated change — nine landing-page template
// files (a concurrent session's in-progress work) already import this exact path/API and were
// failing Vite's import-analysis entirely, breaking the dev server app-wide. A plain max-width/
// padding wrapper is the standard, low-risk shape every one of those call sites already assumes
// (`<Container className="...">{children}</Container>`) — not a guess at their template design,
// just the generic layout primitive their own code already depends on existing.
export function Container({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  )
}
