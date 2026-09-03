import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'
import {
  Building2,
  Target,
  CalendarDays,
  Mail,
  ShoppingBag,
  Image,
  ChevronDown,
  Inbox,
  Palette,
} from 'lucide-react'

interface StartOption {
  templateId: string
  label: string
  description: string
  icon: typeof Building2
}

// The handful of real system templates (see ensureSystemTemplates.ts), reframed by what a
// business is actually trying to do rather than by their internal "lead-gen"/"advanced"
// category. Deliberately not one tile per template — Email capture and Studio are variants of
// Capture leads / Showcase your work, so they live behind "More starting points" instead of
// competing for a primary slot.
const PRIMARY_OPTIONS: StartOption[] = [
  {
    templateId: 'system-template-corporate-professional',
    label: 'Homepage',
    description: 'Introduce yourself with a homepage.',
    icon: Building2,
  },
  {
    templateId: 'system-template-lead-gen',
    label: 'Capture leads',
    description: 'A focused pitch that turns visitors into leads.',
    icon: Target,
  },
  {
    templateId: 'system-template-webinar-signup',
    label: 'Promote event',
    description: 'Get signups for a webinar, workshop, or events.',
    icon: CalendarDays,
  },
  {
    templateId: 'system-template-email-outreach',
    label: 'Land your emails',
    description: 'Create a first-contact email campaign.',
    icon: Mail,
  },
  {
    templateId: 'system-template-store',
    label: 'Sell a product',
    description: 'Showcase and sell what you make.',
    icon: ShoppingBag,
  },
  {
    templateId: 'system-template-portfolio',
    label: 'Showcase your work',
    description: 'A visual portfolio of past work or projects.',
    icon: Image,
  },
]

const MORE_OPTIONS: StartOption[] = [
  {
    templateId: 'system-template-lead-gen-media',
    label: 'Email capture',
    description: 'A simple two-column layout.',
    icon: Inbox,
  },
  {
    templateId: 'system-template-studio',
    label: 'Creative studio',
    description: 'A moodier showcase layout.',
    icon: Palette,
  },
]

export function PagesStartRow({ onError }: { onError: (message: string | null) => void }) {
  const quickCreate = useQuickCreatePage()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)

  async function start(templateId: string) {
    onError(null)
    setPendingId(templateId)
    const result = await quickCreate.create(templateId)
    if (!result.ok) {
      onError(result.message)
      setPendingId(null)
    }
  }

  const disabled = quickCreate.templatesLoading || pendingId !== null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRIMARY_OPTIONS.map((option) => (
          <StartTile
            key={option.templateId}
            option={option}
            pending={pendingId === option.templateId}
            disabled={disabled}
            onClick={() => start(option.templateId)}
          />
        ))}
      </div>

      {showMore ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MORE_OPTIONS.map((option) => (
            <StartTile
              key={option.templateId}
              option={option}
              pending={pendingId === option.templateId}
              disabled={disabled}
              onClick={() => start(option.templateId)}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          More starting points <ChevronDown size={14} />
        </button>
      )}
    </div>
  )
}

function StartTile({
  option,
  pending,
  disabled,
  onClick,
}: {
  option: StartOption
  pending: boolean
  disabled: boolean
  onClick: () => void
}) {
  const Icon = option.icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50',
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {pending ? 'Creating…' : option.label}
        </span>
        <span className="block text-xs text-muted-foreground">{option.description}</span>
      </span>
    </button>
  )
}
