import { usePublishLandingPage } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function AssistantHomepagePublishStep({
  landingPageId,
  onDone,
}: {
  landingPageId: string
  onDone: () => void
}) {
  const publish = usePublishLandingPage()

  async function handleClick() {
    await publish.mutateAsync(landingPageId)
    onDone()
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Your homepage is ready. Publish it to go live.
      </p>
      <Button onClick={handleClick} size="sm" loading={publish.isPending} className="w-full">
        Publish homepage
      </Button>
    </div>
  )
}
