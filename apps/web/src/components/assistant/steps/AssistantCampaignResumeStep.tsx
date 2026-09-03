import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { STEP_COPY } from '../copy'

// Pure navigation — no mutation, no confirmation screen. The campaign already exists; this just
// takes the user to the real campaign detail page (the same one CreateCampaignPage.tsx navigates
// to after creating) to finish it there.
export function AssistantCampaignResumeStep({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose: () => void
}) {
  const navigate = useNavigate()

  function handleClick() {
    navigate(`/campaigns/${campaignId}`)
    onClose()
  }

  return (
    <Button onClick={handleClick} className="w-full">
      {STEP_COPY.campaign_resume.actionLabel}
    </Button>
  )
}
