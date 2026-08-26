import { Link, useParams } from 'react-router-dom'
import { useAuthorizeCampaignBudget, useCampaign, useCampaignFunding, useRecordClientFunding } from '@project/sdk'
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
  const addFunds = useRecordClientFunding()
  const authorize = useAuthorizeCampaignBudget()

  const campaign = campaignQuery.data?.data
  const funding = fundingQuery.data?.data

  if (campaignQuery.isLoading || fundingQuery.isLoading) return <Skeleton className="h-48 w-full" />
  if (!campaign || !funding) return <p className="text-muted-foreground">Not found.</p>

  const hasAuthorization = funding.authorizedAmountMinor > 0

  return (
    <div className="space-y-4">
      <CampaignNav campaignId={campaignId!} name={campaign.name} />
      <p className="text-xs text-muted-foreground">
        Available funds come from the ledger, not planning budget minus spend.
      </p>

      <FundingSnapshot funding={funding} />

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <p className="text-sm font-medium">Client wallet</p>
          <p className="text-xs text-muted-foreground">
            Deposits money into the client wallet. It does not allocate funds to this campaign.
          </p>
        </CardHeader>
        <CardContent>
          <AmountForm
            label="Amount to deposit"
            submitLabel="Add funds to wallet"
            confirmLabel="Confirm: add to wallet"
            confirmCopy={(formatted) =>
              `Add ${formatted} to the client wallet? This increases available funds. It does not authorize this campaign.`
            }
            pending={addFunds.isPending}
            onSubmit={(amountMinor, idempotencyKey) =>
              addFunds.mutateAsync({ amountMinor, currency: 'USD', idempotencyKey }).then(() => undefined)
            }
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-muted-foreground bg-background">
        <CardHeader>
          <p className="text-sm font-medium">This campaign</p>
          <p className="text-xs text-muted-foreground">
            Allocates money already in the wallet to this campaign. It does not add new funds.
          </p>
        </CardHeader>
        <CardContent>
          {hasAuthorization ? (
            <p className="text-sm text-muted-foreground">This campaign already has an active authorization.</p>
          ) : (
            <AmountForm
              label="Amount to allocate"
              submitLabel="Authorize campaign funds"
              confirmLabel="Confirm: authorize campaign"
              confirmCopy={(formatted) =>
                `Authorize ${formatted} for this campaign from the client wallet? This allocates existing funds. It does not add new money.`
              }
              variant="outline"
              defaultValue={String(Math.min(funding.planningBudget, funding.clientAvailableAmountMinor / 100) || '')}
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

      <Link to={`/campaigns/${campaignId}/performance`} className="text-xs text-muted-foreground hover:underline">
        Performance
      </Link>
    </div>
  )
}
