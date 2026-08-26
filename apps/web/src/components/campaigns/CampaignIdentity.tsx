import { useState } from 'react'
import { PLATFORM_LABEL } from '@/components/campaigns/buildCampaignAds'

const PLATFORMS = ['META', 'GOOGLE', 'TIKTOK', 'LOOPIE'] as const
export type CampaignPlatform = (typeof PLATFORMS)[number]

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ENDED: 'Ended',
}

const ghost =
  'bg-transparent border-0 p-0 shadow-none outline-none focus-visible:ring-0 rounded-none'

function toDay(iso: string | null) {
  return iso ? iso.slice(0, 10) : ''
}

export function CampaignIdentity({
  name,
  status,
  startDate,
  endDate,
  budget,
  platforms,
  onSave,
}: {
  name: string
  status: string
  startDate: string
  endDate: string | null
  budget: number
  platforms: CampaignPlatform[]
  onSave: (patch: {
    name?: string
    budget?: number
    endDate?: string | null
    platforms?: CampaignPlatform[]
  }) => void
}) {
  const [draftPlatforms, setDraftPlatforms] = useState(platforms)

  function togglePlatform(platform: CampaignPlatform, checked: boolean) {
    const next = checked
      ? [...draftPlatforms, platform]
      : draftPlatforms.filter((item) => item !== platform)
    if (next.length === 0) return
    setDraftPlatforms(next)
    onSave({ platforms: next })
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {STATUS_LABEL[status] ?? status} · starts {new Date(startDate).toLocaleDateString()}
      </p>
      <input
        aria-label="Name"
        defaultValue={name}
        onBlur={(e) => {
          const next = e.target.value.trim()
          if (next && next !== name) onSave({ name: next })
        }}
        className={`${ghost} text-3xl font-semibold tracking-tight w-full`}
      />
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            End date
          </span>
          <input
            aria-label="End date"
            type="date"
            defaultValue={toDay(endDate)}
            onBlur={(e) => {
              const next = e.target.value
              if (next === toDay(endDate)) return
              onSave({
                endDate: next ? new Date(`${next}T00:00:00`).toISOString() : null,
              })
            }}
            className={`${ghost} text-sm border-b border-border`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Budget
          </span>
          <input
            aria-label="Budget"
            type="number"
            min="0"
            step="1"
            defaultValue={String(budget)}
            onBlur={(e) => {
              const next = Number(e.target.value)
              if (!Number.isFinite(next) || next < 0 || next === budget) return
              onSave({ budget: next })
            }}
            className={`${ghost} text-sm border-b border-border w-28 tabular-nums`}
          />
        </label>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
            Platforms
          </legend>
          {PLATFORMS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draftPlatforms.includes(platform)}
                onChange={(e) => togglePlatform(platform, e.target.checked)}
              />
              {PLATFORM_LABEL[platform]}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  )
}
