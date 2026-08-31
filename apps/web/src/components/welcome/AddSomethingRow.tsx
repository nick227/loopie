import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LayoutTemplate, Mail, Megaphone } from 'lucide-react'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'

// The same three real creation flows CreateMenu.tsx already offers (Message/Page/Ad — see that
// file's own comment on why the list stops there), surfaced inline instead of behind the Create
// dropdown, matching the reference image's "Add something" row. No new creation logic — this
// calls the exact same handlers.
export function AddSomethingRow() {
  const navigate = useNavigate()
  const quickCreatePage = useQuickCreatePage()
  const [pageError, setPageError] = useState<string | null>(null)

  const items = [
    {
      key: 'page',
      label: 'Create page',
      description: 'Build a landing page',
      icon: LayoutTemplate,
      pending: quickCreatePage.isPending,
      onClick: async () => {
        setPageError(null)
        const result = await quickCreatePage.create()
        if (!result.ok) setPageError(result.message)
      },
    },
    {
      key: 'ad',
      label: 'Create ad',
      description: 'Launch an ad campaign',
      icon: Megaphone,
      onClick: () => navigate('/ads/new'),
    },
    {
      key: 'message',
      label: 'Send message',
      description: 'Create and send an email or text',
      icon: Mail,
      onClick: () => navigate('/messages/new'),
    },
  ]

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Add something</h2>
      {pageError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive"
        >
          {pageError}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={item.pending}
            onClick={() => void item.onClick()}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <item.icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {item.pending ? 'Creating…' : item.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
