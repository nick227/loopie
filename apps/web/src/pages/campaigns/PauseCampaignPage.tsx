import { useParams, useNavigate } from 'react-router-dom'
import { usePauseCampaign } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function PauseCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const mutation = usePauseCampaign()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pause Campaign</h1>
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
