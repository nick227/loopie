import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { useAsset, useCreateAsset } from '@project/sdk'
import { MediaPicker } from '@/components/media/MediaPicker'
import { mediaSrc } from '@/lib/media'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const DIMENSION = {
  sm: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-lg',
  // The profile-hero size — a brand-new contact and an established one use the exact same field
  // at this size, just fed by local draft state vs. the live contact (see ContactPage.tsx).
  xl: 'h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl',
} as const

// Circular, replace/remove avatar — same assetId-backed pattern as MediaSlotField (landing-page
// media slots), reusing the shared Asset library and MediaPicker, just with a remove affordance
// MediaSlotField has no need for. avatarUrl is normally passed in directly (resolved server-side
// on the Contact DTO, batched the same way as records/revenue) so an existing contact's list/
// detail views never do a per-row Asset fetch — but a brand-new, not-yet-saved contact has no
// resolved Contact row to batch from, so this also accepts a bare assetId and resolves the URL
// itself via useAsset in that case (a single fetch, not a list — cheap).
export function ContactAvatarField({
  name,
  assetId,
  avatarUrl,
  onChange,
  size = 'lg',
}: {
  name: string
  assetId?: string | null
  avatarUrl?: string | null
  onChange: (assetId: string | null) => void
  size?: 'sm' | 'lg' | 'xl'
}) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | undefined>(assetId ?? undefined)
  const createAsset = useCreateAsset()
  const resolvedAsset = useAsset(avatarUrl === undefined && assetId ? assetId : '')
  const src = mediaSrc(avatarUrl !== undefined ? avatarUrl : resolvedAsset.data?.data?.url)
  const iconSize = size === 'xl' ? 22 : size === 'lg' ? 16 : 13

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setPicked(assetId ?? undefined)
          setOpen(true)
        }}
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-muted-foreground transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          src
            ? 'border border-border hover:opacity-85'
            : 'border-2 border-dashed border-input-border bg-muted/60 hover:border-foreground/30 hover:bg-muted',
          DIMENSION[size],
        )}
        aria-label={src ? 'Replace photo' : 'Add a photo'}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="relative flex h-full w-full items-center justify-center">
            <span className="transition-opacity group-hover:opacity-0">
              {initials(name) || '?'}
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={iconSize} />
            </span>
          </span>
        )}
      </button>
      {assetId ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove photo"
          className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={13} />
        </button>
      ) : null}

      {open ? (
        <MediaPicker
          type="IMAGE"
          selectedIds={picked ? [picked] : []}
          adding={createAsset.isPending}
          single
          onToggle={(id) => setPicked(id)}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            const id = result.data?.id
            if (id) setPicked(id)
          }}
          onConfirm={() => {
            if (picked) onChange(picked)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}
