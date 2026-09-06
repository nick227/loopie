import { connectStatusLabel } from '@/lib/affiliateSplit'

// Tint-pair pill, same convention as AdRow/PageRow's status pills — ready is a positive/success
// state, restricted is worth a second look (warning), onboarding is in-progress (info), and an
// unconnected affiliate stays neutral rather than claiming a status that hasn't happened.
const CONNECT_STATUS_STYLE: Record<string, string> = {
  READY: 'bg-success/10 text-success',
  ONBOARDING: 'bg-info/10 text-info',
  RESTRICTED: 'bg-warning/10 text-warning',
}

export function ConnectStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${CONNECT_STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {connectStatusLabel(status)}
    </span>
  )
}
