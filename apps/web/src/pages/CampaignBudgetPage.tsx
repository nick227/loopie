import { Link, useParams } from 'react-router-dom'
import { useAuthorizeCampaignBudget, useCampaign, useCampaignFunding } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { CampaignNav } from '@/components/campaigns/CampaignNav'
import { FundingSnapshot } from '@/components/campaigns/FundingSnapshot'
import { AmountForm } from '@/components/campaigns/AmountForm'
import { RecordSpendForm } from '@/components/campaigns/RecordSpendForm'

export function CampaignBudgetPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const campaignQuery = useCampaign(campaignId!)
  const fundingQuery = useCampaignFunding(campaignId!)
  const authorize = useAuthorizeCampaignBudget()

  const campaign = campaignQuery.data?.data
  const funding = fundingQuery.data?.data

  if (campaignQuery.isLoading || fundingQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign || !funding) return <p className="text-muted-foreground">Not found.</p>

  const hasLimit = funding.authorizedAmountMinor > 0

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <p className="text-xs text-muted-foreground">
        Spend Plan is operational. Reported and Settled come from Meta/Google billing, not a LOOPIE wallet.
      </p>

      <FundingSnapshot funding={funding} />

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Spend Limit</p>
          <p className="text-xs text-muted-foreground">
            Cap this campaign will manage toward. It does not deposit or hold client money.
          </p>
        </CardHeader>
        <CardContent>
          {hasLimit ? (
            <p className="text-sm text-muted-foreground">This campaign already has a spend limit.</p>
          ) : (
            <AmountForm
              label="Spend limit"
              submitLabel="Set spend limit"
              confirmLabel="Confirm: set spend limit"
              confirmCopy={(formatted) => `Set a ${formatted} spend limit for this campaign?`}
              variant="outline"
              defaultValue={String(funding.planningBudget || '')}
              pending={authorize.isPending}
              onSubmit={(amountMinor, idempotencyKey) =>
                authorize
                  .mutateAsync({ campaignId: campaignId!, amountMinor, currency: 'USD', idempotencyKey })
                  .then(() => undefined)
              }
            />
          )}
        </CardContent>
      </Card>

      {hasLimit ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Platform spend</p>
            <p className="text-xs text-muted-foreground">Type reported spend from Meta/Google. Settled is their billing, not LOOPIE custody.</p>
          </CardHeader>
          <CardContent>
            <RecordSpendForm campaignId={campaignId!} />
          </CardContent>
        </Card>
      ) : null}

      <Link to={`/campaigns/${campaignId}/performance`} className="text-xs text-muted-foreground hover:underline">
        Performance
      </Link>
    </div>
  )
}
