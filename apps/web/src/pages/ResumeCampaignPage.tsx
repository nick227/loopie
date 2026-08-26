import { useParams, useNavigate } from 'react-router-dom'
import { useResumeCampaign } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function ResumeCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const mutation = useResumeCampaign()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Resume Campaign</h1>
      <Button
        onClick={async () => {
          await mutation.mutateAsync(campaignId!)
          navigate(-1)
        }}
        loading={mutation.isPending}
      >
        Confirm
      </Button>
    </div>
  )
}
