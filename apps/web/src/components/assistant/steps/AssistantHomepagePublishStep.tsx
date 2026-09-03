import { usePublishLandingPage } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { STEP_COPY } from '../copy'

export function AssistantHomepagePublishStep({
  landingPageId,
  onSuccess,
}: {
  landingPageId: string
  onSuccess: () => void
}) {
  const publish = usePublishLandingPage()

  async function handleClick() {
    await publish.mutateAsync(landingPageId)
    onSuccess()
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} loading={publish.isPending} className="w-full">
        {STEP_COPY.homepage_publish.actionLabel}
      </Button>
    </div>
  )
}
