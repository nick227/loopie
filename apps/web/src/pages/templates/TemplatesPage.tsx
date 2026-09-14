import { useNavigate } from 'react-router-dom'
import { useTemplates } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { UniversalRowList, UniversalRow } from '@/components/ui/UniversalRow'
import { Plus, List } from 'lucide-react'
import { useFlatPages } from '@/hooks/useFlatPages'
import { CHANNEL_ICON, CHANNEL_LABEL, bodyPreview } from '@/components/messages/MessageRow'

export function TemplatesPage() {
  const navigate = useNavigate()
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTemplates()
  const items = useFlatPages({ data })

  return (
    <div className="space-y-5">
      <PageHeader
        variant="list"
        title="Templates"
        description="Reusable message content — save one, then reuse it the next time you write to an audience."
        primaryAction={
          <Button onClick={() => navigate('/templates/new')}>
            <Plus size={16} /> New template
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={List}
          title="No templates yet"
          description="Save a message as a template to reuse its subject and body next time."
        />
      ) : (
        <UniversalRowList>
          {items.map((item) => {
            const Icon = CHANNEL_ICON[item.channel] ?? CHANNEL_ICON.EMAIL!
            return (
              <UniversalRow
                key={item.id}
                href={`/templates/${item.id}`}
                leading={<Icon size={16} />}
                title={item.name}
                subtitle={item.subject?.trim() || bodyPreview(item.body)}
                meta={[CHANNEL_LABEL[item.channel] ?? item.channel, item.purpose].filter(Boolean)}
              />
            )
          })}
        </UniversalRowList>
      )}

      {hasNextPage ? (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
