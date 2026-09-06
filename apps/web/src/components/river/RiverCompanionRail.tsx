import { BarChart2 } from 'lucide-react'
import { useAdvertisements } from '@project/sdk'
import { HouseAdRenderer } from '../ads/HouseAdRenderer'

export function RiverCompanionRail() {
  const { data: adsData } = useAdvertisements({ limit: 3 })

  const adsCount = adsData?.data?.length ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Your River */}
      <div className="rounded-2xl bg-muted/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart2 size={16} className="text-primary" />
            Your River
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-foreground">12</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Posts</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{adsCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Ads</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">126</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Reactions</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">8</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Page visits</div>
          </div>
        </div>
      </div>

      {/* TOP POSTS */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-2">
          <HouseAdRenderer placement="HOUSE_AD" />
        </div>
      </div>
    </div>
  )
}
