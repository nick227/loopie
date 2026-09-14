import { db } from '@project/db'

// Tracks worker.ts's own liveness, one row per named poller — see WorkerHeartbeat's schema
// comment for why. schedulePoller wraps every setInterval callback in worker.ts so this can't be
// forgotten for a poller added later: recording the heartbeat is structural to how a poller gets
// registered, not an opt-in each one has to remember.
export async function recordHeartbeat(pollerName: string, outcome: { error?: unknown }) {
  const now = new Date()
  try {
    if (outcome.error) {
      await db.workerHeartbeat.upsert({
        where: { pollerName },
        create: {
          pollerName,
          lastTickAt: now,
          lastError: String(outcome.error).slice(0, 2000),
          lastErrorAt: now,
        },
        update: {
          lastTickAt: now,
          lastError: String(outcome.error).slice(0, 2000),
          lastErrorAt: now,
        },
      })
    } else {
      await db.workerHeartbeat.upsert({
        where: { pollerName },
        create: { pollerName, lastTickAt: now, lastSuccessAt: now },
        update: { lastTickAt: now, lastSuccessAt: now },
      })
    }
  } catch (err) {
    // The heartbeat write itself failing (e.g. a transient DB blip) must never be mistaken for
    // the poller failing, and must never throw out of the interval callback.
    console.error(`[Worker] Failed to record heartbeat for ${pollerName}:`, err)
  }
}

// Registers a poller on a fixed interval with three properties none of worker.ts's pollers had
// individually before: (1) a tick is skipped (not queued) if the previous tick of this same
// poller hasn't finished yet — the in-process half of restart/concurrency safety, since a
// setInterval callback that outlives its own interval would otherwise run concurrently with
// itself even on a single instance; (2) every tick's outcome — success or failure — is recorded
// to WorkerHeartbeat, so a poller that silently stops working is visible from the outside instead
// of only showing up as "a feature quietly stopped happening"; (3) a failure is still always
// logged to stderr, exactly as before, in addition to the heartbeat row.
export function schedulePoller(name: string, intervalMs: number, fn: () => Promise<unknown>) {
  let running = false
  setInterval(() => {
    if (running) return
    running = true
    fn()
      .then(() => recordHeartbeat(name, {}))
      .catch((err) => {
        console.error(`[Worker] Error in ${name}:`, err)
        return recordHeartbeat(name, { error: err })
      })
      .finally(() => {
        running = false
      })
  }, intervalMs)
}
