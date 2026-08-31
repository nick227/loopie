import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export type MoreMenuItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

/**
 * Secondary navigation, opened on demand — not a set of root-level tabs. Per
 * docs/strategy/03-product-principles.md's Navigation Principle: Inbox is the root; CRM,
 * Advertisements, and Pages are real, first-class surfaces with their own creation/monitoring —
 * they just aren't peers of Inbox at the root. This is the "more/utility rail" the doc calls for,
 * not a page-swap; it's a Modal so it never competes for the same visual weight as Inbox itself.
 */
export function MoreMenu({
  items,
  utilityItems,
  accountActions,
  trigger,
}: {
  items: MoreMenuItem[]
  utilityItems?: MoreMenuItem[]
  /** Account-level actions (Profile, Log out) — a third, visually separate section, rendered
   * after utilityItems. Lets this one menu serve as the header's whole "compact launcher/account"
   * slot (docs/strategy/03-product-principles.md) instead of needing a second dropdown. A render
   * prop (not a plain node) so the caller can close the menu on click — unlike items/utilityItems
   * (NavLinks, which always leave Shell's route tree on navigate), a Profile link stays inside
   * Shell, so nothing else would close this Modal for it. */
  accountActions?: (close: () => void) => React.ReactNode
  trigger: (props: { onClick: () => void }) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {trigger({ onClick: () => setOpen(true) })}
      {open ? (
        <Modal title="More" onClose={() => setOpen(false)}>
          <div className="space-y-1 pb-2">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent',
                  )
                }
              >
                <item.icon size={18} className="shrink-0 opacity-80" />
                {item.label}
              </NavLink>
            ))}
            {utilityItems && utilityItems.length > 0 ? (
              <div className="mt-2 space-y-1 border-t border-border pt-2">
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Business admin
                </p>
                {utilityItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <item.icon size={16} className="shrink-0 opacity-70" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
            {accountActions ? (
              <div className="mt-2 space-y-1 border-t border-border pt-2">
                {accountActions(() => setOpen(false))}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
