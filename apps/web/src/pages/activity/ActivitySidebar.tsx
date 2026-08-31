import { useSearchParams } from 'react-router-dom'
import { useActivitySavedViews, useDeleteActivitySavedView } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'

export function ActivitySidebar() {
  const [, setSearchParams] = useSearchParams()

  const { data: views, isLoading } = useActivitySavedViews()
  const deleteView = useDeleteActivitySavedView()

  const handleSelectView = (filters: Record<string, unknown>) => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v) next.set(k, String(v))
    }
    // preserve 'inspect' if open? Actually, let's clear it when changing view.
    setSearchParams(next)
  }

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  return (
    <div className="w-64 flex-shrink-0 border-r bg-muted/20 p-4 h-[calc(100vh-3.5rem)] overflow-y-auto hidden md:block">
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">
          Default Views
        </h3>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start font-normal"
            onClick={handleClearFilters}
          >
            Everything
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start font-normal text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
            onClick={() => handleSelectView({ needsAction: 'true' })}
          >
            Needs Action
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">
          Saved Views
        </h3>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : views?.length === 0 ? (
          <div className="text-sm text-muted-foreground">No saved views yet.</div>
        ) : (
          <div className="space-y-1">
            {views?.map((view) => (
              <div key={view.id} className="flex items-center group">
                <Button
                  variant="ghost"
                  className="flex-1 justify-start font-normal truncate"
                  onClick={() => handleSelectView(view.filters as Record<string, unknown>)}
                  title={view.name}
                >
                  {view.name}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete saved view "${view.name}"?`)) {
                      deleteView.mutate(view.id)
                    }
                  }}
                  disabled={deleteView.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
