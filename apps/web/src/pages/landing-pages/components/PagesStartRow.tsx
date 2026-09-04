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

// The handful of real system templates (see ensureSystemTemplates.ts). Labels match the
// catalog names so create UI and the Layout dropdown stay one vocabulary. Email capture and
// Creative studio live behind "More starting points" as alternate layouts for Sales page /
// Portfolio rather than competing for a primary slot.
const PRIMARY_OPTIONS: StartOption[] = [
  {
    templateId: 'system-template-corporate-professional',
    label: 'Homepage',
    description: 'Company site with services, proof, and a contact form.',
    icon: Building2,
  },
  {
    templateId: 'system-template-lead-gen',
    label: 'Sales page',
    description: 'A focused pitch that turns visitors into leads.',
    icon: Target,
  },
  {
    templateId: 'system-template-webinar-signup',
    label: 'Event signup',
    description: 'Countdown, host, and registration for a live event.',
    icon: CalendarDays,
  },
  {
    templateId: 'system-template-email-outreach',
    label: 'Outreach page',
    description: 'Letter-style page for first-contact links.',
    icon: Mail,
  },
  {
    templateId: 'system-template-store',
    label: 'Store',
    description: 'Product grid and a path to buy or inquire.',
    icon: ShoppingBag,
  },
  {
    templateId: 'system-template-portfolio',
    label: 'Portfolio',
    description: 'Image-led showcase with a short inquiry form.',
    icon: Image,
  },
]

const MORE_OPTIONS: StartOption[] = [
  {
    templateId: 'system-template-lead-gen-media',
    label: 'Email capture',
    description: 'Split layout: image beside a short signup form.',
    icon: Inbox,
  },
  {
    templateId: 'system-template-studio',
    label: 'Creative studio',
    description: 'Editorial studio site with selected work and a team.',
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
