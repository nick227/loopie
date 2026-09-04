import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { MediaSlotField } from '../../../../pages/landing-pages/components/MediaSlotField'
import type { TeamMemberItem } from '../../../../pages/landing-pages/components/types'
import { AddRow, type SectionProps } from './shared'
import { KineticBackdrop, SnapPanel, useMotionPanel } from './SnapPanel'
import { ink, kineticWord } from './tokens'

export function TeamSection({ content, editable, onChange }: SectionProps<'team'>) {
  const items = content?.items ?? []
  const { ref, progress } = useMotionPanel()
  const word = kineticWord(content?.headline, 'CREW')

  function updateItem(i: number, patch: Partial<TeamMemberItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }

  if (!items.length && !editable) return null

  return (
    <SnapPanel ref={ref} tone="bg" className="flex flex-col justify-center">
      <KineticBackdrop word={word} progress={progress} mode="scale-x" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 lg:px-8">
        <div className="mb-14 max-w-xl">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Team headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="mb-3 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.9] tracking-tighter"
              />
              <CanvasText
                ariaLabel="Team body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(65) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="mb-3 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.9] tracking-tighter"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: ink(65) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((member, i) => (
            <div key={i} className="group relative">
              {editable ? (
                <MediaSlotField
                  kind="IMAGE"
                  urlMode
                  fallbackUrl={member.media?.url}
                  onUrlChange={(url) => updateItem(i, { media: { ...member.media, url } })}
                />
              ) : member.media?.url ? (
                <img
                  src={member.media.url}
                  alt={member.media.alt ?? member.name}
                  className="mb-4 aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="mb-4 aspect-[3/4] w-full" style={{ backgroundColor: ink(6) }} />
              )}
              {editable ? (
                <CanvasText
                  as="h3"
                  ariaLabel={`Team member ${i + 1} name`}
                  value={member.name}
                  onChange={(name) => updateItem(i, { name })}
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                  className="text-lg font-black uppercase tracking-tight"
                />
              ) : (
                <h3
                  className="text-lg font-black uppercase tracking-tight"
                  style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                >
                  {member.name}
                </h3>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel={`Team member ${i + 1} role`}
                  value={member.role ?? ''}
                  onChange={(role) => updateItem(i, { role })}
                  className="mt-0.5 text-sm"
                  style={{ color: ink(60) }}
                />
              ) : member.role ? (
                <p className="mt-0.5 text-sm" style={{ color: ink(60) }}>
                  {member.role}
                </p>
              ) : null}
              {editable ? (
                <CanvasText
                  ariaLabel={`Team member ${i + 1} bio`}
                  value={member.bio ?? ''}
                  onChange={(bio) => updateItem(i, { bio })}
                  multiline
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: ink(65) }}
                />
              ) : member.bio ? (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: ink(65) }}>
                  {member.bio}
                </p>
              ) : null}
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                  aria-label="Remove"
                  className="absolute right-0 top-0 text-xs opacity-0 group-hover:opacity-100"
                  style={{ color: ink(45) }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRow
            label="Add person"
            onClick={() => onChange({ items: [...items, { name: 'New team member' }] })}
          />
        ) : null}
      </div>
    </SnapPanel>
  )
}
