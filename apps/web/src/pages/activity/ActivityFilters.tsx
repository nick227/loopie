import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useCreateActivitySavedView } from '@project/sdk'

export function ActivityFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const createView = useCreateActivitySavedView()

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'ALL') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setSearchParams(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pb-4">
      <select
        value={searchParams.get('source') || 'ALL'}
        onChange={(e) => setFilter('source', e.target.value)}
        className="h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="ALL">All Sources</option>
        <option value="WEBSITE">Website</option>
        <option value="LOOPIE">Loopie</option>
        <option value="PLATFORM">Platform</option>
        <option value="AUTOMATION">Automation</option>
      </select>

      <select
        value={searchParams.get('needsAction') || 'ALL'}
        onChange={(e) => setFilter('needsAction', e.target.value)}
        className="h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="ALL">All States</option>
        <option value="true">Needs Action</option>
      </select>

      {/* 
        More filters can be added here (Type, Person, Ad, Page, Status, Date) 
        following the exact same pattern.
      */}

      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        disabled={createView.isPending}
        onClick={() => {
          const name = prompt('Name for this view:')
          if (!name) return

          const filters: Record<string, string> = {}
          searchParams.forEach((val, key) => {
            if (key !== 'inspect') filters[key] = val
          })

          createView.mutate({ name, filters })
        }}
      >
        Save View
      </Button>
    </div>
  )
}
