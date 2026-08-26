import { useCreateBillingCheckout, useCreateBillingPortal, useBilling } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function BillingPage() {
  const billing = useBilling()
  const checkout = useCreateBillingCheckout()
  const portal = useCreateBillingPortal()
  const status = billing.data?.data.subscriptionStatus

  async function go(url: string) {
    window.location.assign(url)
  }

  if (billing.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Billing</h1>
      <Card>
        <CardContent className="py-4 space-y-3">
          <p className="text-sm">LOOPIE subscription. This is not ad spend and does not fund a client wallet.</p>
          <p className="text-sm text-muted-foreground">Status: {status ?? 'none'}</p>
          {status === 'active' || status === 'trialing' ? (
            <Button
              disabled={portal.isPending}
              onClick={async () => {
                const result = await portal.mutateAsync()
                await go(result.data.url)
              }}
            >
              Manage billing
            </Button>
          ) : (
            <Button
              disabled={checkout.isPending}
              onClick={async () => {
                const result = await checkout.mutateAsync()
                await go(result.data.url)
              }}
            >
              Subscribe
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
