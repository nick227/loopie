import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCreateAffiliateConnectOnboarding, useSyncAffiliateConnect } from '@project/sdk'
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

export function useConnectReturn(affiliateId: string) {
  const [params, setParams] = useSearchParams()
  const onboard = useCreateAffiliateConnectOnboarding()
  const sync = useSyncAffiliateConnect()
  const ran = useRef(false)

  useEffect(() => {
    const flag = params.get('connect')
    if (!affiliateId || !flag || ran.current) return
    ran.current = true
    if (flag === 'refresh') {
      onboard.mutateAsync(affiliateId).then((result) => window.location.assign(result.data.url))
      return
    }
    if (flag === 'return') {
      sync.mutateAsync(affiliateId).then(() => {
        params.delete('connect')
        setParams(params, { replace: true })
      })
    }
  }, [affiliateId, onboard, params, setParams, sync])
}
