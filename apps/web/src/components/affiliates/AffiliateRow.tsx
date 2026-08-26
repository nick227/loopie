import { Link } from 'react-router-dom'
import { formatBps } from '@/lib/money'

export function AffiliateRow({
  name,
  rateLabel,
  className,
}: {
  name: string
  rateLabel: string
  className?: string
}) {
  return (
    <div className={className ?? 'py-4 flex items-center justify-between gap-3'}>
      <p className="text-sm font-medium">{name}</p>
      <span className="text-xs text-muted-foreground shrink-0">{rateLabel}</span>
    </div>
  )
}

export function rateLabel(bps: number | null | undefined, rule: string) {
  if (rule === 'FIXED') return 'Fixed'
  return formatBps(bps)
}

export function AffiliateLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="block">
      {children}
    </Link>
  )
}
