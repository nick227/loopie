import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Calendar, Clock, Quote, ChevronDown, Users, Plus } from 'lucide-react'
import { CanvasText } from '../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { MediaSlotField } from '../../../pages/landing-pages/components/MediaSlotField'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type {
  PageContent,
  TestimonialItem,
  FaqItem,
  FeatureItem,
} from '../../../pages/landing-pages/components/types'

// Same token vocabulary/fallbacks as CorporateProfessional.tsx and PageCanvas.tsx — any layout
// that sets these --lp-* custom properties on its own wrapper picks up theme changes for free.
const TOKEN_DEFAULTS = {
  primaryColor: '#FF2D6A',
  onPrimaryColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  inkColor: '#0A0A0A',
  cardColor: '#F5F5F5',
  fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  headingFont: 'Syne, ui-sans-serif, system-ui, sans-serif',
  radius: '9999px',
}

const ink = (mix: number) => `color-mix(in srgb, var(--lp-ink) ${mix}%, var(--lp-bg))`

type SectionProps<K extends keyof PageContent> = {
  content: PageContent[K]
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent[K]>>) => void
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium"
      style={{ color: ink(55) }}
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  )
}

// --- Countdown -------------------------------------------------------------

function useCountdown(eventDate?: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!eventDate) return null
  const target = new Date(eventDate).getTime()
  if (Number.isNaN(target)) return null
  const diff = target - now
  if (diff <= 0) return { started: true, days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    started: false,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight"
        style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[11px] uppercase tracking-widest" style={{ color: ink(55) }}>
        {label}
      </span>
    </div>
  )
}

function Countdown({ eventDate }: { eventDate?: string }) {
  const t = useCountdown(eventDate)
  if (!eventDate) {
    return (
      <p className="text-sm" style={{ color: ink(55) }}>
        Set an event date to show a live countdown.
      </p>
    )
  }
  if (!t) return null
  if (t.started) {
    return (
      <p className="text-sm font-semibold" style={{ color: 'var(--lp-ink)' }}>
        This event has started
      </p>
    )
  }
  return (
    <div className="flex items-center gap-4 md:gap-6">
      <CountdownUnit value={t.days} label="Days" />
      <CountdownUnit value={t.hours} label="Hrs" />
      <CountdownUnit value={t.minutes} label="Min" />
      <CountdownUnit value={t.seconds} label="Sec" />
    </div>
  )
}

// --- Editable date/time ------------------------------------------------------

function isoToLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatEventDate(iso?: string): string {
  if (!iso) return 'Set an event date'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Set an event date'
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function EditableDateTime({
  value,
  onChange,
}: {
  value?: string
  onChange: (iso: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="datetime-local"
        aria-label="Event date and time"
        defaultValue={isoToLocalInput(value)}
        onBlur={(e) => {
          setEditing(false)
          if (e.target.value) onChange(new Date(e.target.value).toISOString())
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="rounded border px-2 py-1 text-sm"
        style={{ borderColor: ink(22), backgroundColor: 'transparent', color: 'var(--lp-ink)' }}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Event date and time"
      className="text-left underline decoration-dotted underline-offset-4"
      style={{ color: 'var(--lp-ink)' }}
    >
      {formatEventDate(value)}
    </button>
  )
}

// --- Hero — primary color field, massive centered headline, one hot CTA (Amacrux / Forwex).

function HeroSection({ content, editable, onChange }: SectionProps<'hero'>) {
  const cta = content?.primaryCta ?? {}
  const media = content?.media ?? {}
  const muted = `color-mix(in srgb, var(--lp-on-primary) 78%, transparent)`
  return (
    <section
      className="relative overflow-hidden pt-20 pb-20 lg:pt-28 lg:pb-24"
      style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
    >
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center lg:px-8">
        {editable ? (
          <CanvasText
            ariaLabel="Hero eyebrow"
            value={content?.eyebrow ?? ''}
            onChange={(eyebrow) => onChange({ eyebrow })}
            placeholder="Eyebrow label"
            className="mx-auto mb-6 inline-block px-0 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: muted }}
          />
        ) : content?.eyebrow ? (
          <span
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: muted }}
          >
            {content.eyebrow}
          </span>
        ) : null}

        {editable ? (
          <CanvasText
            as="h1"
            ariaLabel="Hero headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            placeholder="Headline"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-on-primary)' }}
            className="text-[clamp(2.75rem,8vw,5.5rem)] font-extrabold leading-[1.02] tracking-tight"
          />
        ) : (
          <h1
            className="text-[clamp(2.75rem,8vw,5.5rem)] font-extrabold leading-[1.02] tracking-tight"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-on-primary)' }}
          >
            {content?.headline}
          </h1>
        )}

        {editable ? (
          <CanvasText
            ariaLabel="Hero body"
            value={content?.body ?? ''}
            onChange={(body) => onChange({ body })}
            multiline
            placeholder="Subheadline"
            style={{ color: muted }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl"
          />
        ) : (
          <p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl"
            style={{ color: muted }}
          >
            {content?.body}
          </p>
        )}

        <div className="mt-10 flex justify-center">
          {editable ? (
            <EditableLinkTrigger
              label={cta.label ?? ''}
              url={cta.url ?? '#signup'}
              onChange={(next) => onChange({ primaryCta: next })}
            >
              <span
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold"
                style={{
                  backgroundColor: 'var(--lp-ink)',
                  color: 'var(--lp-bg)',
                  borderRadius: 'var(--lp-radius)',
                }}
              >
                {cta.label || 'Add a call to action'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </span>
            </EditableLinkTrigger>
          ) : cta.label ? (
            <a
              href={cta.url}
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold no-underline transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--lp-ink)',
                color: 'var(--lp-bg)',
                borderRadius: 'var(--lp-radius)',
              }}
            >
              {cta.label}
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          ) : null}
        </div>

        {(editable || media.url) && (
          <div
            className="relative mx-auto mt-14 max-w-4xl overflow-hidden"
            style={{ borderRadius: 'var(--lp-radius)' }}
          >
            {editable ? (
              <MediaSlotField
                kind="IMAGE"
                urlMode
                fallbackUrl={media.url}
                onUrlChange={(url) => onChange({ media: { ...media, url } })}
              />
            ) : media.url ? (
              <img src={media.url} alt={media.alt || ''} className="w-full" />
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

// --- Event widget --------------------------------------------------------------

function EventWidgetSection({
  content,
  editable,
  onChange,
  seatsFilled,
  hasForm,
  formFields,
  onFormFields,
  submitLabel,
}: SectionProps<'webinar'> & {
  seatsFilled: number
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
}) {
  const seatsTotal = content?.seatsTotal
  const pct = seatsTotal ? Math.min(100, Math.round((seatsFilled / seatsTotal) * 100)) : null

  return (
    <section
      id="signup"
      className="py-16 lg:py-20"
      style={{ backgroundColor: 'var(--lp-bg)', color: 'var(--lp-ink)' }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-2 lg:px-8">
        {/* Event meta */}
        <div
          className="p-8"
          style={{
            backgroundColor: 'var(--lp-card)',
            color: 'var(--lp-ink)',
            border: `2px solid ${ink(28)}`,
            borderRadius: 'var(--lp-radius)',
          }}
        >
          <div className="mb-8">
            <Countdown eventDate={content?.eventDate} />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar size={16} style={{ color: ink(55) }} />
              {editable ? (
                <EditableDateTime
                  value={content?.eventDate}
                  onChange={(eventDate) => onChange({ eventDate })}
                />
              ) : (
                <span>{formatEventDate(content?.eventDate)}</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Clock size={16} style={{ color: ink(55) }} />
              {editable ? (
                <CanvasText
                  ariaLabel="Duration"
                  value={content?.durationMinutes ? String(content.durationMinutes) : ''}
                  onChange={(v) =>
                    onChange({ durationMinutes: Number(v.replace(/[^0-9]/g, '')) || undefined })
                  }
                  placeholder="60"
                  className="w-16"
                />
              ) : null}
              <span>
                {editable
                  ? 'minutes live'
                  : content?.durationMinutes
                    ? `${content.durationMinutes} minutes, live`
                    : ''}
              </span>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5" style={{ color: ink(65) }}>
                <Users size={15} /> Seats reserved
              </span>
              <span className="font-semibold">
                {seatsFilled}
                {seatsTotal ? ` / ${seatsTotal}` : ''}
              </span>
            </div>
            {pct !== null ? (
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: ink(12) }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: 'var(--lp-primary)' }}
                />
              </div>
            ) : null}
            {editable ? (
              <label className="mt-2 block text-xs" style={{ color: ink(55) }}>
                Capacity (optional)
                <CanvasText
                  ariaLabel="Seats total"
                  value={seatsTotal ? String(seatsTotal) : ''}
                  onChange={(v) =>
                    onChange({ seatsTotal: Number(v.replace(/[^0-9]/g, '')) || undefined })
                  }
                  placeholder="No capacity set"
                  className="mt-0.5 block w-32"
                />
              </label>
            ) : null}
          </div>

          <div
            className="mt-8 flex items-start gap-3 border-t pt-6"
            style={{ borderColor: ink(15) }}
          >
            {editable ? (
              <MediaSlotField
                kind="IMAGE"
                urlMode
                fallbackUrl={content?.hostAvatarUrl}
                onUrlChange={(url) => onChange({ hostAvatarUrl: url })}
              />
            ) : content?.hostAvatarUrl ? (
              <img
                src={content.hostAvatarUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              {editable ? (
                <CanvasText
                  ariaLabel="Host name"
                  value={content?.hostName ?? ''}
                  onChange={(hostName) => onChange({ hostName })}
                  placeholder="Host name"
                  className="font-semibold"
                />
              ) : (
                <p className="font-semibold">{content?.hostName}</p>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel="Host title"
                  value={content?.hostTitle ?? ''}
                  onChange={(hostTitle) => onChange({ hostTitle })}
                  placeholder="Host title"
                  className="text-sm"
                  style={{ color: ink(55) }}
                />
              ) : (
                <p className="text-sm" style={{ color: ink(55) }}>
                  {content?.hostTitle}
                </p>
              )}
              {editable ? (
                <CanvasText
                  ariaLabel="Host bio"
                  value={content?.hostBio ?? ''}
                  onChange={(hostBio) => onChange({ hostBio })}
                  multiline
                  placeholder="Short host bio"
                  className="mt-1 text-sm"
                  style={{ color: ink(65) }}
                />
              ) : content?.hostBio ? (
                <p className="mt-1 text-sm" style={{ color: ink(65) }}>
                  {content.hostBio}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Signup form */}
        <div
          className="p-8"
          style={{
            backgroundColor: 'var(--lp-card)',
            color: 'var(--lp-ink)',
            border: `2px solid ${ink(28)}`,
            borderRadius: 'var(--lp-radius)',
          }}
        >
          <h3 className="mb-1 text-2xl font-bold" style={{ fontFamily: 'var(--lp-heading)' }}>
            Reserve your seat
          </h3>
          <p className="mb-6 text-sm" style={{ color: ink(65) }}>
            Free to attend — we’ll email your link and a reminder.
          </p>
          {!hasForm ? (
            <div
              className="rounded-xl border border-dashed p-6 text-center text-sm"
              style={{ borderColor: ink(20), color: ink(55) }}
            >
              No reusable form attached. Choose a form above to embed real fields here.
            </div>
          ) : (
            <>
              <div className="[&_input]:!bg-[var(--lp-bg)] [&_input]:!text-[var(--lp-ink)] [&_select]:bg-[var(--lp-bg)] [&_select]:text-[var(--lp-ink)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-ink)_65%,var(--lp-bg))] [&_button]:!text-[var(--lp-ink)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-ink)_22%,var(--lp-bg))]">
                <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              </div>
              <button
                type="button"
                disabled
                className="mt-4 w-full px-6 py-3.5 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--lp-primary)',
                  color: 'var(--lp-on-primary)',
                  borderRadius: 'var(--lp-radius)',
                }}
              >
                {submitLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// --- Features / testimonials / faq / footer -------------------------------------

function FeatureGridSection({ content, editable, onChange }: SectionProps<'features'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<FeatureItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="py-24" style={{ backgroundColor: 'var(--lp-bg)' }}>
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {editable ? (
            <>
              <CanvasText
                as="h2"
                ariaLabel="Features headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
                className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
              />
              <CanvasText
                ariaLabel="Features body"
                value={content?.body ?? ''}
                onChange={(body) => onChange({ body })}
                multiline
                style={{ color: ink(70) }}
                className="text-lg"
              />
            </>
          ) : (
            <>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
                style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
              >
                {content?.headline}
              </h2>
              <p className="text-lg" style={{ color: ink(70) }}>
                {content?.body}
              </p>
            </>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((feature, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border p-6"
              style={{ borderColor: ink(12), backgroundColor: ink(3) }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
              >
                {i + 1}
              </div>
              {editable ? (
                <>
                  <CanvasText
                    as="h3"
                    ariaLabel={`Feature ${i + 1} title`}
                    value={feature.title}
                    onChange={(title) => updateItem(i, { title })}
                    style={{ color: 'var(--lp-ink)' }}
                    className="font-bold mb-2"
                  />
                  <CanvasText
                    ariaLabel={`Feature ${i + 1} body`}
                    value={feature.body}
                    onChange={(body) => updateItem(i, { body })}
                    multiline
                    style={{ color: ink(70) }}
                    className="text-sm leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                    aria-label="Remove"
                    className="absolute right-3 top-3 text-xs opacity-0 group-hover:opacity-100"
                    style={{ color: ink(45) }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-bold mb-2" style={{ color: 'var(--lp-ink)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: ink(70) }}>
                    {feature.body}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
        {editable ? (
          <div className="text-center">
            <AddRowButton
              label="Add takeaway"
              onClick={() => onChange({ items: [...items, { title: 'New takeaway', body: '' }] })}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function TestimonialsSection({ content, editable, onChange }: SectionProps<'testimonials'>) {
  const items = content?.items ?? []
  function updateItem(i: number, patch: Partial<TestimonialItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="py-24 border-t" style={{ backgroundColor: ink(4), borderColor: ink(10) }}>
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Testimonials headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-12 text-center"
          />
        ) : (
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-12 text-center"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((t, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border p-7"
              style={{ backgroundColor: 'var(--lp-card)', borderColor: ink(10) }}
            >
              <Quote className="mb-4 h-8 w-8" style={{ color: ink(20) }} />
              {editable ? (
                <>
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} quote`}
                    value={t.quote}
                    onChange={(quote) => updateItem(i, { quote })}
                    multiline
                    style={{ color: ink(85) }}
                    className="italic leading-relaxed mb-4"
                  />
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} author`}
                    value={t.author}
                    onChange={(author) => updateItem(i, { author })}
                    className="font-semibold"
                    style={{ color: 'var(--lp-ink)' }}
                  />
                  <CanvasText
                    ariaLabel={`Testimonial ${i + 1} role`}
                    value={t.role ?? ''}
                    onChange={(role) => updateItem(i, { role })}
                    className="text-sm"
                    style={{ color: ink(55) }}
                  />
                </>
              ) : (
                <>
                  <p className="italic leading-relaxed mb-4" style={{ color: ink(85) }}>
                    &quot;{t.quote}&quot;
                  </p>
                  <p className="font-semibold" style={{ color: 'var(--lp-ink)' }}>
                    {t.author}
                  </p>
                  <p className="text-sm" style={{ color: ink(55) }}>
                    {t.role}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
        {editable ? (
          <div className="text-center">
            <AddRowButton
              label="Add testimonial"
              onClick={() => onChange({ items: [...items, { quote: '', author: 'New attendee' }] })}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}

function FAQSection({ content, editable, onChange }: SectionProps<'faq'>) {
  const items = content?.items ?? []
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  function updateItem(i: number, patch: Partial<FaqItem>) {
    onChange({ items: items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) })
  }
  return (
    <section className="py-24" style={{ backgroundColor: 'var(--lp-bg)' }}>
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="FAQ headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-10 text-center"
          />
        ) : (
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-10 text-center"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}
        <div className="space-y-3">
          {items.map((faq, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl border"
              style={{ borderColor: ink(12) }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left"
                style={{ backgroundColor: 'var(--lp-card)' }}
              >
                {editable ? (
                  <CanvasText
                    ariaLabel={`Question ${i + 1}`}
                    value={faq.question}
                    onChange={(question) => updateItem(i, { question })}
                    className="font-semibold"
                    style={{ color: 'var(--lp-ink)' }}
                  />
                ) : (
                  <span className="font-semibold" style={{ color: 'var(--lp-ink)' }}>
                    {faq.question}
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                  style={{ color: ink(45) }}
                />
              </button>
              {openIndex === i ? (
                <div
                  className="p-5 pt-0 text-sm leading-relaxed"
                  style={{ backgroundColor: 'var(--lp-card)', color: ink(70) }}
                >
                  {editable ? (
                    <CanvasText
                      ariaLabel={`Answer ${i + 1}`}
                      value={faq.answer}
                      onChange={(answer) => updateItem(i, { answer })}
                      multiline
                    />
                  ) : (
                    faq.answer
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {editable ? (
          <AddRowButton
            label="Add question"
            onClick={() =>
              onChange({ items: [...items, { question: 'New question', answer: '' }] })
            }
          />
        ) : null}
      </div>
    </section>
  )
}

function CTASection({ content, editable, onChange }: SectionProps<'footer'>) {
  const cta = content?.cta ?? {}
  return (
    <section className="py-20 border-t" style={{ backgroundColor: ink(4), borderColor: ink(12) }}>
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        {editable ? (
          <CanvasText
            as="h2"
            ariaLabel="Closing headline"
            value={content?.headline ?? ''}
            onChange={(headline) => onChange({ headline })}
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
            className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4"
          />
        ) : (
          <h2
            className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4"
            style={{ fontFamily: 'var(--lp-heading)', color: 'var(--lp-ink)' }}
          >
            {content?.headline}
          </h2>
        )}
        {editable ? (
          <CanvasText
            ariaLabel="Closing body"
            value={content?.body ?? ''}
            onChange={(body) => onChange({ body })}
            multiline
            style={{ color: ink(70) }}
            className="mb-8"
          />
        ) : (
          <p className="mb-8" style={{ color: ink(70) }}>
            {content?.body}
          </p>
        )}
        {editable ? (
          <EditableLinkTrigger
            label={cta.label ?? ''}
            url={cta.url ?? '#signup'}
            onChange={(next) => onChange({ cta: next })}
          >
            <span
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold"
              style={{
                backgroundColor: 'var(--lp-primary)',
                color: 'var(--lp-on-primary)',
                borderRadius: 'var(--lp-radius)',
              }}
            >
              {cta.label || 'Add a call to action'}
            </span>
          </EditableLinkTrigger>
        ) : cta.label ? (
          <a
            href={cta.url}
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold no-underline"
            style={{
              backgroundColor: 'var(--lp-primary)',
              color: 'var(--lp-on-primary)',
              borderRadius: 'var(--lp-radius)',
            }}
          >
            {cta.label}
          </a>
        ) : null}
      </div>
    </section>
  )
}

export function WebinarSignup({
  content,
  theme,
  layoutConfig,
  editable = false,
  onSlotChange,
  hasForm,
  formFields,
  onFormFields,
  submitLabel,
  seatsFilled,
}: {
  content?: PageContent
  theme?: Record<string, string>
  layoutConfig?: { sections?: Record<string, { hidden?: boolean }> }
  editable?: boolean
  onSlotChange?: (slotGroup: keyof PageContent, patch: unknown) => void
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
  seatsFilled: number
}) {
  const c = content ?? {}
  const t = theme ?? {}
  const isHidden = (sectionKey: string) => Boolean(layoutConfig?.sections?.[sectionKey]?.hidden)

  function slotChange<K extends keyof PageContent>(
    key: K,
    patch: Partial<NonNullable<PageContent[K]>>,
  ) {
    onSlotChange?.(key, { ...(c[key] as object | undefined), ...patch })
  }

  return (
    <div
      className="min-h-screen antialiased"
      style={{
        backgroundColor: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        color: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        fontFamily: t.fontFamily ?? TOKEN_DEFAULTS.fontFamily,
        ['--lp-primary' as string]: t.primaryColor ?? TOKEN_DEFAULTS.primaryColor,
        ['--lp-on-primary' as string]: t.onPrimaryColor ?? TOKEN_DEFAULTS.onPrimaryColor,
        ['--lp-bg' as string]: t.backgroundColor ?? TOKEN_DEFAULTS.backgroundColor,
        ['--lp-ink' as string]: t.inkColor ?? TOKEN_DEFAULTS.inkColor,
        ['--lp-card' as string]: t.cardColor ?? TOKEN_DEFAULTS.cardColor,
        ['--lp-heading' as string]: t.headingFont ?? TOKEN_DEFAULTS.headingFont,
        ['--lp-radius' as string]: t.radius ?? TOKEN_DEFAULTS.radius,
      }}
    >
      <HeroSection
        content={c.hero}
        editable={editable}
        onChange={(patch) => slotChange('hero', patch)}
      />
      <EventWidgetSection
        content={c.webinar}
        editable={editable}
        onChange={(patch) => slotChange('webinar', patch)}
        seatsFilled={seatsFilled}
        hasForm={hasForm}
        formFields={formFields}
        onFormFields={onFormFields}
        submitLabel={submitLabel}
      />
      {!isHidden('features') && (
        <FeatureGridSection
          content={c.features}
          editable={editable}
          onChange={(patch) => slotChange('features', patch)}
        />
      )}
      {!isHidden('testimonials') && (
        <TestimonialsSection
          content={c.testimonials}
          editable={editable}
          onChange={(patch) => slotChange('testimonials', patch)}
        />
      )}
      {!isHidden('faq') && (
        <FAQSection
          content={c.faq}
          editable={editable}
          onChange={(patch) => slotChange('faq', patch)}
        />
      )}
      {!isHidden('footer') && (
        <CTASection
          content={c.footer}
          editable={editable}
          onChange={(patch) => slotChange('footer', patch)}
        />
      )}
    </div>
  )
}
