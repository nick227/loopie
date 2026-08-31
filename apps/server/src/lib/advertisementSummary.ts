type Run = {
  platform: string
  placement?: string | null
  status: string
  budget?: { toString(): string } | number | null
  spend?: { toString(): string } | number | null
  impressions: number
  clicks: number
  conversions: number
}

function runLabel(run: Run) {
  if (run.platform === 'LOOPIE') return 'Pages'
  if (run.platform === 'GOOGLE' && run.placement === 'YOUTUBE') return 'YouTube'
  if (run.platform === 'GOOGLE') return 'Google'
  if (run.platform === 'META') return 'Facebook'
  if (run.platform === 'TIKTOK') return 'TikTok'
  return run.platform
}

function money(value: Run['budget']) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function advertisementSummary(runs: Run[]) {
  const live = runs.filter((run) => run.status !== 'ENDED')
  const active = live.filter((run) => run.status === 'ACTIVE')
  const status = active.length
    ? 'RUNNING'
    : live.some((run) => run.status === 'PAUSED')
      ? 'PAUSED'
      : live.some(
            (run) => run.status === 'VALIDATION_FAILED' || run.status === 'PROVISIONING_FAILED',
          )
        ? 'FAILED'
        : live.length
          ? 'READY'
          : 'DRAFT'

  return {
    status,
    spend: live.reduce((sum, run) => sum + money(run.spend), 0),
    impressions: live.reduce((sum, run) => sum + run.impressions, 0),
    clicks: live.reduce((sum, run) => sum + run.clicks, 0),
    conversions: live.reduce((sum, run) => sum + run.conversions, 0),
    dailyBudget: active.reduce((sum, run) => sum + money(run.budget), 0),
    destinations: [...new Set(live.map(runLabel))],
  }
}
