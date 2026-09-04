import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Reusable studio layout: compact left panel, dominant right preview, optional section below.
 * AdEditor uses this now; AdDesigner can adopt the same shell later without sharing ad logic.
 */
export function AdStudioShell({
  left,
  right,
  below,
  className,
}: {
  left: ReactNode
  right: ReactNode
  below?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-8', className)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">{left}</div>
        <div className="min-w-0">{right}</div>
      </div>
      {below ? <div className="min-w-0">{below}</div> : null}
    </div>
  )
}
