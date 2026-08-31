import { useSearchParams } from 'react-router-dom'
import { ActivityStream } from './ActivityStream'
import { ActivityFilters } from './ActivityFilters'
import { ActivityInspector } from './ActivityInspector'
import { ActivitySidebar } from './ActivitySidebar'
import { useActivityCheckpoint } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { ArrowUp } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function ActivityPage() {
  const [searchParams] = useSearchParams()
  const inspectId = searchParams.get('inspect')
  const isInspecting = !!inspectId

  const queryClient = useQueryClient()

  // Polling checkpoint to see if there are new items
  useActivityCheckpoint()

  // We can peek at the first item in the stream to see if we're out of date
  // A perfect implementation would check if the stream's highest observedAt is older than checkpoint.latestObservedAt
  // For simplicity, we just provide a manual refresh button if the checkpoint changes.
  // In a real app we'd want to store the "last refreshed checkpoint" in state to compare.

  // For now, let's just make the "Refresh" button invalidate the stream query.
  const refreshStream = () => {
    queryClient.invalidateQueries({ queryKey: ['activity', 'stream'] })
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] -m-4 sm:-m-6 lg:-m-8">
      <ActivitySidebar />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${isInspecting ? 'lg:pr-[400px] xl:pr-[450px]' : ''}`}
      >
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
                <p className="text-muted-foreground">View and manage your business events.</p>
              </div>

              <Button onClick={refreshStream} variant="outline" size="sm" className="gap-2">
                <ArrowUp className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            <ActivityFilters />

            <ActivityStream />
          </div>
        </div>
      </div>

      {/* Inspector Panel */}
      {isInspecting && (
        <div className="hidden lg:block fixed right-0 top-16 bottom-0 w-[400px] xl:w-[450px] border-l bg-background shadow-xl z-20">
          <ActivityInspector />
        </div>
      )}

      {/* Mobile Inspector Overlay */}
      {isInspecting && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm h-full bg-background border-l shadow-2xl animate-in slide-in-from-right">
            <ActivityInspector />
          </div>
        </div>
      )}
    </div>
  )
}
