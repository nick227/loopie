import { Link, useParams } from 'react-router-dom'
import { useAuthorizeCampaignBudget, useCampaign, useCampaignFunding, useRecordClientFunding } from '@project/sdk'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { FundingSnapshot } from '@/components/campaigns/FundingSnapshot'
import { AmountForm } from '@/components/campaigns/AmountForm'
import { RecordSpendForm } from '@/components/campaigns/RecordSpendForm'

export function CampaignBudgetPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const campaignQuery = useCampaign(campaignId!)
  const fundingQuery = useCampaignFunding(campaignId!)
  const addFunds = useRecordClientFunding()
  const authorize = useAuthorizeCampaignBudget()

  const campaign = campaignQuery.data?.data
  const funding = fundingQuery.data?.data

  if (campaignQuery.isLoading || fundingQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign || !funding) return <p className="text-muted-foreground">Not found.</p>

  const hasAuthorization = funding.authorizedAmountMinor > 0

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/campaigns/${campaignId}`} className="text-xs text-muted-foreground hover:underline">
          ← {campaign.name}
        </Link>
        <h1 className="text-xl font-semibold">Budget</h1>
        <p className="text-xs text-muted-foreground">
          Available funds come from the ledger, not planning budget minus spend.
        </p>
      </div>

      <FundingSnapshot funding={funding} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Add client funds</p>
          </CardHeader>
          <CardContent>
            <AmountForm
              label="Funds to add"
              submitLabel="Add funds"
              pending={addFunds.isPending}
              onSubmit={(amountMinor, idempotencyKey) =>
                addFunds.mutateAsync({ amountMinor, currency: 'USD', idempotencyKey }).then(() => undefined)
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-medium">{hasAuthorization ? 'Authorization' : 'Authorize campaign'}</p>
          </CardHeader>
          <CardContent>
            {hasAuthorization ? (
              <p className="text-sm text-muted-foreground">This campaign already has an active authorization.</p>
            ) : (
              <AmountForm
                label="Amount to authorize"
                submitLabel="Authorize budget"
                defaultValue={String(Math.min(funding.planningBudget, funding.clientAvailableAmountMinor / 100) || '')}
                pending={authorize.isPending}
                onSubmit={(amountMinor, idempotencyKey) =>
                  authorize.mutateAsync({ campaignId: campaignId!, amountMinor, currency: 'USD', idempotencyKey }).then(() => undefined)
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {hasAuthorization ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Platform spend</p>
            <p className="text-xs text-muted-foreground">Tracked metrics stay on the deployment; this records settlement.</p>
          </CardHeader>
          <CardContent>
            <RecordSpendForm campaignId={campaignId!} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
