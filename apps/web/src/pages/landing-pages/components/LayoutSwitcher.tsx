import { useState } from 'react'
import { useLandingPageCompatibility, useLandingPageTemplates } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChevronDown, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'

// Pages Phase 3 (2026-09-10) — see docs/strategy/pages-page-types-and-style-axes-roadmap.md §6
// Phase 3. Replaces the old raw <select> that let a draft's templateId jump to ANY of the 8
// Layouts with no compatibility awareness at all. Two distinct, contract-checked actions, per the
// roadmap: "Switch layout" (same Page Type only) and "Convert page type" (any Page Type, only
// surfaced when at least one of its Layouts is actually compatible).

type CompatibilityIssue = { kind: 'capability' | 'slot'; key: string; reason: string }
type LayoutEntry = {
  layoutId: string
  pageType: string
  compatible: boolean
  blockers: CompatibilityIssue[]
  warnings: CompatibilityIssue[]
}
type PageTypeEntry = {
  pageType: string
  compatible: boolean
  blockers: CompatibilityIssue[]
  warnings: CompatibilityIssue[]
  supportedLayoutIds: string[]
}

const PAGE_TYPE_LABEL: Record<string, string> = {
  HOME: 'Home page',
  LANDING: 'Landing page',
  STUDIO: 'Studio',
  PORTFOLIO: 'Portfolio',
  EMAIL_CAPTURE: 'Email capture',
  STORE: 'Store',
  EVENT: 'Event',
  GENERAL: 'Blank',
}

function StatusIcon({ compatible, hasWarnings }: { compatible: boolean; hasWarnings: boolean }) {
  if (!compatible) return <XCircle size={14} className="shrink-0 text-destructive" />
  if (hasWarnings) return <AlertTriangle size={14} className="shrink-0 text-amber-500" />
  return <CheckCircle2 size={14} className="shrink-0 text-muted-foreground/40" />
}

function issueSummary(issues: CompatibilityIssue[]): string {
  return issues.map((i) => i.reason).join(' ')
}

export function LayoutSwitcher({
  landingPageId,
  templateId,
  onSelect,
}: {
  landingPageId: string
  templateId: string
  onSelect: (templateId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'layout' | 'pageType'>('layout')
  const [pendingSelection, setPendingSelection] = useState<{
    templateId: string
    blockers: CompatibilityIssue[]
  } | null>(null)

  const templates = useFlatPages(useLandingPageTemplates())
  const compatQuery = useLandingPageCompatibility(open ? landingPageId : '')
  const compat = compatQuery.data?.data as
    | {
        currentLayoutId: string
        currentPageType: string
        layouts: LayoutEntry[]
        pageTypes: PageTypeEntry[]
      }
    | undefined

  const currentTemplate = templates.find((t) => t.id === templateId)
  const currentLabel = currentTemplate?.name ?? 'Layout'

  function choose(nextTemplateId: string, blockers: CompatibilityIssue[]) {
    if (blockers.length > 0) {
      setPendingSelection({ templateId: nextTemplateId, blockers })
      return
    }
    onSelect(nextTemplateId)
    setOpen(false)
  }

  const sameTypeLayouts = compat?.layouts.filter((l) => l.pageType === compat.currentPageType) ?? []
  const otherPageTypes =
    compat?.pageTypes.filter((t) => t.pageType !== compat.currentPageType && t.compatible) ?? []

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode('layout')
          setOpen(true)
        }}
        className="relative inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-input-border bg-transparent px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/20"
      >
        <span className="shrink-0">Layout</span>
        <span className="max-w-[9rem] truncate text-xs normal-case text-foreground">
          {currentLabel}
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open ? (
        <Modal
          title={mode === 'layout' ? 'Switch layout' : 'Convert page type'}
          onClose={() => {
            setOpen(false)
            setPendingSelection(null)
          }}
        >
          <div className="space-y-4">
            {compatQuery.isLoading || !compat ? (
              <p className="text-sm text-muted-foreground">Checking what fits…</p>
            ) : mode === 'layout' ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {PAGE_TYPE_LABEL[compat.currentPageType] ?? compat.currentPageType} layouts.
                  Content that isn&apos;t shown here stays saved — it just won&apos;t render on the
                  layout you pick.
                </p>
                <ul className="space-y-1.5">
                  {sameTypeLayouts.map((layout) => {
                    const template = templates.find((t) => t.id === layout.layoutId)
                    const isCurrent = layout.layoutId === templateId
                    return (
                      <li key={layout.layoutId}>
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => choose(layout.layoutId, layout.blockers)}
                          className="flex w-full items-start gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:cursor-default disabled:opacity-60"
                        >
                          <StatusIcon
                            compatible={layout.compatible}
                            hasWarnings={layout.warnings.length > 0}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-foreground">
                              {template?.name ?? layout.layoutId}
                              {isCurrent ? ' (current)' : ''}
                            </span>
                            {!layout.compatible ? (
                              <span className="mt-0.5 block text-xs text-destructive">
                                {issueSummary(layout.blockers)}
                              </span>
                            ) : layout.warnings.length > 0 ? (
                              <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-400">
                                {issueSummary(layout.warnings)}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {otherPageTypes.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setMode('pageType')}
                    className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                  >
                    This page could also become a different kind of page →
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Changes what kind of page this is. Only Page Types with at least one layout that
                  fits your current content are shown.
                </p>
                <ul className="space-y-1.5">
                  {otherPageTypes.map((pt) => {
                    const bestLayoutId = pt.supportedLayoutIds[0]
                    const bestLayout = templates.find((t) => t.id === bestLayoutId)
                    return (
                      <li key={pt.pageType}>
                        <button
                          type="button"
                          onClick={() => bestLayoutId && choose(bestLayoutId, [])}
                          className="flex w-full items-start gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                        >
                          <CheckCircle2
                            size={14}
                            className="mt-0.5 shrink-0 text-muted-foreground/40"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-foreground">
                              {PAGE_TYPE_LABEL[pt.pageType] ?? pt.pageType}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              Becomes {bestLayout?.name ?? bestLayoutId}
                              {pt.warnings.length > 0 ? ` — ${issueSummary(pt.warnings)}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => setMode('layout')}
                  className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                >
                  ← Back to layouts
                </button>
              </>
            )}
          </div>
        </Modal>
      ) : null}

      {pendingSelection ? (
        <Modal
          title="This will hide something you've added"
          onClose={() => setPendingSelection(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {issueSummary(pendingSelection.blockers)} Nothing is deleted — the content stays saved
              and reappears if you switch back or to another layout that supports it.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingSelection(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onSelect(pendingSelection.templateId)
                  setPendingSelection(null)
                  setOpen(false)
                }}
              >
                Switch anyway
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
