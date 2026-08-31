import { LayoutTemplate } from 'lucide-react'
import { formatCount } from '@/components/home/homeFormat'
import type { LivePresenceCardData } from './livePresenceCardTypes'
import { Link } from 'react-router-dom'

// Text-only, deliberately — the earlier browser-chrome + hero-image thumbnail read as a confusing
// half-preview (an image too small to actually convey the page, styled to look like it should).
// A clear status/eyebrow line, the page's own name as the real headline, its live URL, and its two
// real stats say more at this size than a tiny screenshot ever did.
export function LivePresencePageCard({
  item,
  className,
}: {
  item: LivePresenceCardData
  className?: string
}) {
  const slug = item.href.split('/').pop()
  return (
    <Link
      to={item.href}
      className={`flex h-72 flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-foreground/20 ${className ?? ''}`}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <LayoutTemplate size={14} />
        <span className="text-xs font-medium uppercase tracking-wider">Page</span>
        <span className="ml-auto shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
          {item.statusLabel}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 text-xl font-semibold leading-snug text-foreground">
        {item.title}
      </p>
      <p className="mt-1.5 truncate text-sm text-muted-foreground">/p/{slug}</p>
      <div className="mt-auto flex items-center gap-6 border-t border-border pt-4">
        <div>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatCount(item.stat1.value)}
          </p>
          <p className="text-xs text-muted-foreground">{item.stat1.label}</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatCount(item.stat2.value)}
          </p>
          <p className="text-xs text-muted-foreground">{item.stat2.label}</p>
        </div>
      </div>
    </Link>
  )
}
