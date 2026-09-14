import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useLandingPageVersions, type components } from '@project/sdk'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'

type PublishedPageVersion = components['schemas']['PublishedPageVersion']

function VersionRow({ version, isLive }: { version: PublishedPageVersion; isLive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const sectionKeys = Object.keys(version.content ?? {})

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium">Version {version.version}</span>
          {isLive ? (
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
              Live now
            </span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(version.publishedAt).toLocaleString()}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
          {sectionKeys.length > 0 ? (
            <p>Sections in this version: {sectionKeys.join(', ')}</p>
          ) : (
            <p>No section content recorded for this version.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function LandingPageVersionsModal({
  landingPageId,
  currentPublishedVersionId,
  onClose,
}: {
  landingPageId: string
  currentPublishedVersionId: string | null | undefined
  onClose: () => void
}) {
  const query = useLandingPageVersions(landingPageId)
  const versions = query.data?.data ?? []

  return (
    <Modal title="Version history" onClose={onClose} size="xl">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Every past publish, frozen exactly as it went live. This is a read-only history —
          restoring an earlier version isn&apos;t supported yet.
        </p>
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This page has never been published — nothing to show yet.
          </p>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                isLive={version.id === currentPublishedVersionId}
              />
            ))}
          </div>
        )}
        {query.data?.meta?.hasMore ? (
          <p className="text-xs text-muted-foreground">
            Older versions exist beyond what&apos;s shown here.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
