import type { FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { MediaSlotField } from './MediaSlotField'
import { CanvasText } from './CanvasText'

export function CanvasSplitCapture({
  headline,
  assetId,
  imageUrl,
  hasForm,
  formFields,
  submitLabel,
  onHeadline,
  onImage,
  onClearImage,
}: {
  headline: string
  assetId: string | undefined
  imageUrl: string | undefined
  hasForm: boolean
  formFields: FormFieldDraft[]
  submitLabel: string
  onHeadline: (headline: string) => void
  onImage: (assetId: string | undefined) => void
  onClearImage: () => void
}) {
  return (
    <section className="grid min-h-[28rem] lg:grid-cols-2">
      <MediaSlotField
        kind="IMAGE"
        assetId={assetId}
        fallbackUrl={imageUrl}
        fill
        onChange={onImage}
        onClearFallback={onClearImage}
      />
      <div
        className="flex flex-col justify-center px-8 py-10"
        style={{ backgroundColor: 'var(--lp-card)', color: 'var(--lp-ink)' }}
      >
        <CanvasText
          ariaLabel="Pitch"
          value={headline}
          onChange={onHeadline}
          placeholder="Your pitch"
          multiline
          rows={5}
          style={{ fontFamily: 'var(--lp-heading)' }}
          className="mb-6 text-[1.7rem] font-semibold leading-snug"
        />
        <div className="max-w-xs space-y-3">
          {!hasForm ? (
            <div className="rounded border border-dashed p-4 text-sm opacity-65">
              Choose a reusable form above to embed real fields here.
            </div>
          ) : (
            formFields.map((field) => (
              <label key={field.fieldKey} className="flex flex-col gap-1 text-sm">
                {field.label}
                <input
                  disabled
                  aria-label={field.label}
                  type={field.type === 'EMAIL' ? 'email' : 'text'}
                  className="rounded border px-2.5 py-2"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--lp-ink) 18%, var(--lp-card))',
                    backgroundColor: 'var(--lp-bg)',
                    color: 'var(--lp-ink)',
                  }}
                />
              </label>
            ))
          )}
          {hasForm ? (
            <button
              type="button"
              disabled
              className="rounded-md px-5 py-2.5 text-sm font-medium"
              style={{ backgroundColor: 'var(--lp-primary)', color: 'var(--lp-on-primary)' }}
            >
              {submitLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
