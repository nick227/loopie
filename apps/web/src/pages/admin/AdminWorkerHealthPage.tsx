import { useAdminGetWorkerHeartbeat } from '@project/sdk'

// The worker gap this closes: apps/server/src/worker.ts's 8+ background pollers (automations,
// scheduled messages, Meta ad status/spend sync, affiliate payouts, calendar reminders, Google
// Sheets schedule sync, ...) previously ran nowhere in production, and the failure mode was
// totally silent — every feature that depends on one just quietly stopped working with nothing
// anywhere to notice. This page is the "so this can't silently regress again" answer: each
// poller writes a heartbeat row on every tick, success or failure, so a dead/crash-looping
// worker is visible here instead of only showing up as a feature complaint weeks later.
const STALE_MS = 5 * 60_000

function isStale(iso: string) {
  return Date.now() - new Date(iso).getTime() > STALE_MS
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h ago`
  return new Date(iso).toLocaleString()
}

export function AdminWorkerHealthPage() {
  const query = useAdminGetWorkerHeartbeat()
  const rows = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Worker health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Last tick / last success / last error for every background poller in the worker service. A
          poller with no recent tick means the worker process itself is down; a recent tick with a
          stale success and a populated error means the worker is alive but that specific job is
          failing.
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No heartbeat rows yet — the worker service may not have ticked once since it was deployed,
          or isn&apos;t running.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border text-sm">
          {rows.map((row) => {
            const stale = isStale(row.lastTickAt)
            return (
              <div
                key={row.pollerName}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${stale ? 'bg-destructive' : row.lastError ? 'bg-warning' : 'bg-success'}`}
                    aria-hidden
                  />
                  <span className="font-medium">{row.pollerName}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-right">
                  <span className="text-muted-foreground">
                    tick {timeAgo(row.lastTickAt)} · success {timeAgo(row.lastSuccessAt)}
                  </span>
                  {row.lastError ? (
                    <span className="max-w-md truncate text-destructive" title={row.lastError}>
                      {row.lastError}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
