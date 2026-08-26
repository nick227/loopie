import { useParams, useNavigate } from 'react-router-dom'
import { useDuplicateCampaign } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function DuplicateCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const navigate = useNavigate()
  const mutation = useDuplicateCampaign()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Duplicate Campaign</h1>
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
