import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Image } from 'lucide-react'
import { Link } from 'react-router-dom'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: {
    label: 'Draft',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  ACTIVE: {
    label: 'Active',
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-500 animate-pulse',
  },
  PAUSED: {
    label: 'Paused',
    bg: 'bg-amber-100 dark:bg-amber-900',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  ENDED: {
    label: 'Ended',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

interface Campaign {
  id: string
  name: string
  budget: number
  status: string
  startDate?: string
  endDate?: string | null
}

export function CampaignRow({ campaign }: { campaign: Campaign }) {
  const config = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT!

  return (
    <Card className="border-border bg-surface overflow-hidden">
      <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
        {/* Visual Anchor: Creative Thumbnail */}
        <div className="w-full sm:w-48 bg-muted border-r border-border flex items-center justify-center shrink-0 min-h-[120px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Image size={24} />
            <span className="text-[10px] uppercase font-semibold tracking-wider">No Creative</span>
          </div>
        </div>

        {/* Data Presentation */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start gap-4">
            <div>
              <Link to={`/campaigns/${campaign.id}`} className="hover:underline">
                <h3 className="text-base font-semibold text-foreground">{campaign.name}</h3>
              </Link>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${config.bg} ${config.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
                {campaign.startDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(campaign.startDate).toLocaleDateString()}
                    {campaign.endDate
                      ? ` - ${new Date(campaign.endDate).toLocaleDateString()}`
                      : ' - Ongoing'}
                  </span>
                )}
              </div>
            </div>

            <Link to={`/campaigns/${campaign.id}`} className="text-sm underline underline-offset-4">
              Manage
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            ${campaign.budget.toLocaleString()} budget
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
