import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateCampaign, nextActionQueryKey } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { STEP_COPY } from '../copy'

// Mirrors CreateCampaignPage.tsx's own minimal real flow exactly: same hook, same required
// fields ({name, destinationUrl}), then navigates to the real campaign detail page to finish
// creatives/ad units there — no assistant-specific campaign-creation logic.
export function AssistantCampaignCreateStep({
  pageName,
  pageUrl,
  onClose,
}: {
  pageName: string
  pageUrl: string
  onClose: () => void
}) {
  const createCampaign = useCreateCampaign()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    try {
      const result = await createCampaign.mutateAsync({
        name: `Promote ${pageName}`,
        destinationUrl: pageUrl,
      })
      // AssistantPanel stays mounted (never remounts on reopen), so nothing else refetches this
      // — the resolver's view of the world genuinely changed (a campaign now exists).
      queryClient.invalidateQueries({ queryKey: nextActionQueryKey })
      navigate(`/campaigns/${result.data!.id}`)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The campaign could not be created.')
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button onClick={handleClick} loading={createCampaign.isPending} className="w-full">
        {STEP_COPY.campaign_create.actionLabel}
      </Button>
    </div>
  )
}
