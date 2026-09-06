import { useCreateAffiliateConnectOnboarding } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function SetUpPayoutsButton({
  affiliateId,
  connectStatus,
}: {
  affiliateId: string
  connectStatus: string
}) {
  const onboard = useCreateAffiliateConnectOnboarding()
  if (connectStatus === 'READY') return <p className="text-sm">Payouts ready.</p>
  return (
    <Button
      size="sm"
      disabled={onboard.isPending}
      onClick={async () => {
        const result = await onboard.mutateAsync(affiliateId)
        window.location.assign(result.data.url)
      }}
    >
      Set up payouts
    </Button>
  )
}
