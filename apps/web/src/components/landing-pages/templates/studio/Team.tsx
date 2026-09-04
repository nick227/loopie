import { motion, useTransform, type MotionValue } from 'framer-motion'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import type { TeamMemberItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, Eyebrow, type SectionProps } from './shared'
import { FrameInner, SnapPanel, useMotionPanel } from './SnapPanel'
import { useStudioMotionDisabled } from './motion'
import { BODY, ink, TITLE } from './tokens'

/**
 * Frame gesture: portraits reveal via clip-path from the bottom edge — staggered.
 */
function MemberCard({
  member,
  index,
  editable,
  progress,
  onPatch,
  onRemove,
}: {
  member: TeamMemberItem
  index: number
  editable: boolean
  progress: MotionValue<number>
  onPatch: (patch: Partial<TeamMemberItem>) => void
  onRemove: () => void
}) {
  const disabled = useStudioMotionDisabled()
  const start = 0.22 + index * 0.08
  const end = start + 0.2
  const clip = useTransform(progress, [start, end], ['inset(100% 0 0 0)', 'inset(0 0 0 0)'])
  const y = useTransform(progress, [start, end], [20, 0])
  const opacity = useTransform(progress, [start, end], [0, 1])

  return (
    <div className="group relative">
      <motion.div style={disabled ? undefined : { clipPath: clip }} className="overflow-hidden">
        {editable ? (
          <MediaSlotField
            kind="IMAGE"
            urlMode
            fallbackUrl={member.media?.url}
            onUrlChange={(url) => onPatch({ media: { ...member.media, url } })}
          />
        ) : member.media?.url ? (
          <img
            src={member.media.url}
            alt={member.media.alt ?? member.name}
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <div className="aspect-[3/4] w-full" style={{ backgroundColor: ink(6) }} />
        )}
      </motion.div>
      <motion.div className="mt-4" style={disabled ? undefined : { y, opacity }}>
        {editable ? (
          <CanvasText
            as="h3"
            ariaLabel={`Team member ${index + 1} name`}
            value={member.name}
            onChange={(name) => onPatch({ name })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="text-lg font-semibold tracking-tight"
          />
        ) : (
          <h3
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {member.name}
          </h3>
        )}
        {editable ? (
          <CanvasText
            ariaLabel={`Team member ${index + 1} role`}
            value={member.role ?? ''}
            onChange={(role) => onPatch({ role })}
            className="mt-0.5 text-sm"
            style={{ color: ink(55) }}
          />
        ) : member.role ? (
          <p className="mt-0.5 text-sm" style={{ color: ink(55) }}>
            {member.role}
          </p>
        ) : null}
        {editable ? (
          <CanvasText
            ariaLabel={`Team member ${index + 1} bio`}
            value={member.bio ?? ''}
            onChange={(bio) => onPatch({ bio })}
            multiline
            className={`mt-2 ${BODY} text-sm`}
            style={{ color: ink(62) }}
          />
        ) : member.bio ? (
          <p className={`mt-2 ${BODY} text-sm`} style={{ color: ink(62) }}>
            {member.bio}
          </p>
        ) : null}
      </motion.div>
      {editable ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
          style={{ color: ink(45) }}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export function TeamSection({ content, editable, onChange }: SectionProps<'team'>) {
  const items = content?.items ?? []
  const { ref, progress } = useMotionPanel()

  if (!items.length && !editable) return null

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-center">
      <FrameInner>
        <Eyebrow muted>The people</Eyebrow>
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Team headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className={`${TITLE} mb-3`}
          />
        ) : (
          <h2
            className={`${TITLE} mb-3`}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}
        {editable ? (
          <CanvasText
            ariaLabel="Team body"
            value={content?.body ?? ''}
            onChange={(body) => onChange({ body })}
            multiline
            style={{ color: ink(62) }}
            className={`${BODY} mb-12 max-w-lg`}
          />
        ) : content?.body ? (
          <p className={`${BODY} mb-12 max-w-lg`} style={{ color: ink(62) }}>
            {content.body}
          </p>
        ) : (
          <div className="mb-12" />
        )}

        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((member, i) => (
            <MemberCard
              key={i}
              member={member}
              index={i}
              editable={editable}
              progress={progress}
              onPatch={(patch) =>
                onChange({
                  items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
                })
              }
              onRemove={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
            />
          ))}
        </div>
        {editable ? (
          <AddRow
            label="Add person"
            onClick={() => onChange({ items: [...items, { name: 'New team member' }] })}
          />
        ) : null}
      </FrameInner>
    </SnapPanel>
  )
}
