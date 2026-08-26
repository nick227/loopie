import { useSearchParams } from 'react-router-dom'
import { useCreateBillingCheckout, useCreateBillingPortal, useBilling } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  billingActionError,
  checkoutReturnMessage,
  subscriptionStatusLabel,
  toBillingSnapshot,
} from '@/lib/billingCopy'
import { useState } from 'react'

export function BillingPage() {
  const [params] = useSearchParams()
  const billing = useBilling()
  const checkout = useCreateBillingCheckout()
  const portal = useCreateBillingPortal()
  const [actionError, setActionError] = useState<string | null>(null)
  const data = toBillingSnapshot(billing.data?.data)
  const status = data?.subscriptionStatus
  const configured = data?.configured === true
  const returnCopy = checkoutReturnMessage(params.get('checkout'))

  async function go(url: string) {
    window.location.assign(url)
  }

  if (billing.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Billing</h1>
      <Card>
        <CardContent className="py-4 space-y-3">
          <p className="text-sm">
            LOOPIE subscription. This is not ad spend and does not fund a client wallet.
          </p>
          <p className="text-sm">
            {data?.planName ?? 'LOOPIE'}
            {data?.planPriceLabel ? ` · ${data.planPriceLabel}` : ''}
          </p>
          <p className="text-sm text-muted-foreground">{subscriptionStatusLabel(status)}</p>
          {returnCopy && <p className="text-sm">{returnCopy}</p>}
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          {!configured ? (
            <p className="text-sm text-muted-foreground">
              Billing isn&apos;t connected yet. Subscribe will be available once Stripe is
              configured.
            </p>
          ) : status === 'active' || status === 'trialing' ? (
            <Button
              disabled={portal.isPending}
              onClick={async () => {
                setActionError(null)
                try {
                  await go((await portal.mutateAsync()).data.url)
                } catch (err) {
                  setActionError(billingActionError(err))
                }
              }}
            >
              Manage billing
            </Button>
          ) : (
            <Button
              disabled={checkout.isPending}
              onClick={async () => {
                setActionError(null)
                try {
                  await go((await checkout.mutateAsync()).data.url)
                } catch (err) {
                  setActionError(billingActionError(err))
                }
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
