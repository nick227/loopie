import { BarChart2, Lightbulb, Clock, ArrowRight, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useAdvertisements,
  useLandingPages,
  useActivityStream,
  type components,
} from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { relativeTime } from '@/components/home/homeFormat'

type LandingPage = components['schemas']['LandingPage']
type Advertisement = components['schemas']['Advertisement']
type ActivityItem = components['schemas']['ActivityItem']

export function RiverCompanionRail() {
  const { data: landingPagesData } = useLandingPages({ limit: 3 })
  const { data: adsData } = useAdvertisements({ limit: 3 })
  const { data: activityData } = useActivityStream({ limit: 5 })

  const adsCount = adsData?.meta?.totalCount ?? 0

  const readyToShare = [
    ...(landingPagesData?.pages?.[0]?.data ?? []).map((p: LandingPage) => ({
      id: p.id,
      title: p.name,
      subtitle: `Published page · ${relativeTime(p.createdAt)}`,
      imageUrl: null,
      type: 'page',
    })),
    ...(adsData?.data ?? []).map((a: Advertisement) => ({
      id: a.id,
      title: a.name,
      subtitle: `Advertisement · ${relativeTime(a.updatedAt)}`,
      imageUrl: null,
      type: 'ad',
    })),
  ].slice(0, 3)

  const activities = activityData?.pages?.[0]?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Your River */}
      <div className="rounded-2xl bg-muted/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart2 size={16} className="text-primary" />
            Your River
          </div>
          <Link
            to="/analytics"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            View analytics <ArrowRight size={12} />
          </Link>
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

      {/* Ready to share */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb size={16} className="text-primary" />
            Ready to share
          </div>
          <Link to="/assets" className="text-xs font-medium text-primary hover:underline">
            See all
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Turn your existing content into posts.</p>

        <div className="flex flex-col gap-4">
          {readyToShare.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-lg bg-muted border border-border/50 flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">
                    {item.type}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {item.subtitle}
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs px-3 rounded-full">
                Share
              </Button>
            </div>
          ))}
          {readyToShare.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              No content available to share yet.
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border/50 my-2" />

      {/* Recent activity */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock size={16} className="text-muted-foreground" />
            Recent activity
          </div>
          <Link to="/activity" className="text-xs font-medium text-primary hover:underline">
            See all
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {activities.map((activity: ActivityItem) => (
            <div key={activity.id} className="flex gap-3">
              <div className="mt-0.5">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User size={12} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground line-clamp-2">
                  {activity.summary || 'New activity'}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {activity.detail || relativeTime(activity.observedAt)}
                </div>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              No recent activity.
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="px-1 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb size={16} className="text-primary" />
            Tips
          </div>
          <Link to="/tips" className="text-xs font-medium text-primary hover:underline">
            See all
          </Link>
        </div>
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-start gap-3 cursor-pointer hover:bg-primary/10 transition-colors">
          <div className="text-primary mt-0.5">
            <BarChart2 size={16} />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">Share your latest page</div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Posts that link to a page get 3x more engagement.
            </div>
          </div>
          <ArrowRight size={14} className="text-primary/50 ml-auto self-center shrink-0" />
        </div>
      </div>
    </div>
  )
}
