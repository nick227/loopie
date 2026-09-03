import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

/** Submit label + post-submit message for the page's attached Form — frozen into the published snapshot on Publish. */
export function FormCaptureSettings({
  submitLabel,
  successMessage,
  onSubmitLabel,
  onSuccessMessage,
}: {
  submitLabel: string
  successMessage: string
  onSubmitLabel: (value: string) => void
  onSuccessMessage: (value: string) => void
}) {
  return (
    <div className="self-start rounded-xl border border-input-border bg-card p-3.5">
      <div className="mb-2.5">
        <p className="text-sm font-semibold text-foreground">Form</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Shown on the published page. Republish to update what visitors see.
        </p>
      </div>
      <div className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Submit button label
          </span>
          <Input
            value={submitLabel}
            onChange={(e) => onSubmitLabel(e.target.value)}
            placeholder="Get in touch"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Success message
          </span>
          <Textarea
            value={successMessage}
            onChange={(e) => onSuccessMessage(e.target.value)}
            rows={2}
            voice
            placeholder="Thanks — we'll be in touch."
          />
        </label>
      </div>
    </div>
  )
}
