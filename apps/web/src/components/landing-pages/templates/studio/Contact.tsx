import { ArrowRight } from 'lucide-react'
import { CanvasText } from '../../../../pages/landing-pages/components/CanvasText'
import { EditableLinkTrigger } from '../../../../pages/landing-pages/components/editable/EditableLinkTrigger'
import { FormFieldsEditor, type FormFieldDraft } from '@/components/forms/FormFieldsEditor'
import { SolidCta, type SectionProps } from './shared'
import { ColorWash, FrameInner, SnapPanel, useMotionPanel, washForIndex } from './SnapPanel'
import { BODY, TITLE } from './tokens'

/**
 * Closing frame: rising color wash behind the inquiry form (same ColorWash
 * used across almost every snap — Contact is just the last beat).
 */
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
  const wash = washForIndex(7)

  return (
    <SnapPanel ref={ref} id="contact" tone="primary" className="flex flex-col justify-center">
      <ColorWash progress={progress} color={wash.color} edge={wash.edge} rest="42%" />
      <FrameInner className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          {editable ? (
            <CanvasText
              as="h2"
              ariaLabel="Closing headline"
              value={content?.headline ?? ''}
              onChange={(headline) => onChange({ headline })}
              style={{ fontFamily: 'var(--lp-heading)' }}
              className={`${TITLE} mb-5`}
            />
          ) : (
            <h2 className={`${TITLE} mb-5`} style={{ fontFamily: 'var(--lp-heading)' }}>
              {content?.headline}
            </h2>
          )}
          {editable ? (
            <CanvasText
              ariaLabel="Closing body"
              value={content?.body ?? ''}
              onChange={(body) => onChange({ body })}
              multiline
              className={`${BODY} max-w-sm opacity-80`}
            />
          ) : (
            <p className={`${BODY} max-w-sm opacity-80`}>{content?.body}</p>
          )}
          {editable ? (
            <div className="mt-6">
              <EditableLinkTrigger
                label={cta.label ?? ''}
                url={cta.url ?? '#contact'}
                onChange={(next) => onChange({ cta: next })}
              >
                <span className="text-sm font-semibold underline underline-offset-4">
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
              <div className="mt-6">
                <SolidCta inverted>
                  {submitLabel} <ArrowRight className="h-4 w-4" />
                </SolidCta>
              </div>
            </>
          )}
        </div>
      </FrameInner>
    </SnapPanel>
  )
}
