import { ArrowRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import type { SectionProps } from './shared'
import { KineticBackdrop, KineticHeadline, SnapPanel, useMotionPanel } from './SnapPanel'
import { kineticWord } from './tokens'

export function ContactSection({
  content,
  editable,
  onChange,
  hasForm,
  formFields,
  onFormFields,
  submitLabel,
}: SectionProps<'footer'> & {
  hasForm: boolean
  formFields: FormFieldDraft[]
  onFormFields: (fields: FormFieldDraft[]) => void
  submitLabel: string
}) {
  const cta = content?.cta ?? {}
  const { ref, progress } = useMotionPanel()
  const word = kineticWord(content?.headline, 'HELLO')

  return (
    <SnapPanel ref={ref} id="contact" tone="primary" className="flex flex-col justify-center">
      <KineticBackdrop word={word} progress={progress} mode="crush" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 py-28 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div>
          <KineticHeadline progress={progress}>
            {editable ? (
              <CanvasText
                as="h2"
                ariaLabel="Closing headline"
                value={content?.headline ?? ''}
                onChange={(headline) => onChange({ headline })}
                style={{ fontFamily: 'var(--lp-heading)' }}
                className="mb-5 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.9] tracking-tighter"
              />
            ) : (
              <h2
                className="mb-5 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.9] tracking-tighter"
                style={{ fontFamily: 'var(--lp-heading)' }}
              >
                {content?.headline}
              </h2>
            )}
          </KineticHeadline>
          {editable ? (
            <CanvasText
              ariaLabel="Closing body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              className="max-w-sm leading-relaxed opacity-80"
            />
          ) : (
            <p className="max-w-sm leading-relaxed opacity-80">{content?.body}</p>
          )}
          {editable ? (
            <div className="mt-6">
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ cta: next })}
              >
                <span className="text-sm font-bold uppercase tracking-widest underline underline-offset-4">
                  {cta.label || 'Add a call to action'}
                </span>
              </EditableLinkTrigger>
            </div>
          ) : null}
        </div>
        <div>
          {!hasForm ? (
            <p className="text-sm opacity-70">
              No reusable form attached. Choose a form above to embed real fields here.
            </p>
          ) : (
            <>
              <div className="[&_label]:!text-[color:color-mix(in_srgb,var(--lp-on-primary)_75%,transparent)] [&_input]:!rounded-none [&_input]:!border-0 [&_input]:!border-b [&_input]:!border-[color:color-mix(in_srgb,var(--lp-on-primary)_35%,transparent)] [&_input]:!bg-transparent [&_input]:!px-0 [&_input]:!pb-2 [&_input]:!text-[color:var(--lp-on-primary)] [&_select]:!rounded-none [&_select]:!border-0 [&_select]:!border-b [&_select]:!border-[color:color-mix(in_srgb,var(--lp-on-primary)_35%,transparent)] [&_select]:!bg-transparent [&_select]:!px-0 [&_select]:!text-[color:var(--lp-on-primary)] [&_.text-muted-foreground]:!text-[color:color-mix(in_srgb,var(--lp-on-primary)_60%,transparent)] [&_button]:!text-[color:var(--lp-on-primary)] [&_button]:!border-[color:color-mix(in_srgb,var(--lp-on-primary)_35%,transparent)]">
                <FormFieldsEditor fields={formFields} onChange={onFormFields} protectEmail />
              </div>
              <button
                type="button"
                disabled
                className="mt-6 inline-flex items-center gap-2 bg-[var(--lp-ink)] px-5 py-3 text-sm font-bold uppercase tracking-widest text-[var(--lp-bg)]"
              >
                {submitLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </SnapPanel>
  )
}
