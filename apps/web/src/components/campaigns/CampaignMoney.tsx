import { AmountForm } from '@/components/campaigns/AmountForm'
import { RecordSpendForm } from '@/components/campaigns/RecordSpendForm'
import { FundingSnapshot } from '@/components/campaigns/FundingSnapshot'

type Funding = {
  planningBudget: number
  authorizedAmountMinor: number
  reservedAmountMinor: number
  platformReportedAmountMinor: number
  settledAmountMinor: number
  clientAvailableAmountMinor: number
}

export function CampaignMoney({
  campaignId,
  funding,
  pending,
  onAuthorize,
}: {
  campaignId: string
  funding: Funding
  pending: boolean
  onAuthorize: (amountMinor: number, idempotencyKey: string) => Promise<void>
}) {
  const hasLimit = funding.authorizedAmountMinor > 0

  return (
    <section id="money" className="space-y-4">
      <h2 className="text-sm font-medium tracking-wide uppercase">Spend</h2>
      <p className="text-xs text-muted-foreground">
        Spend Plan is operational. Reported and Settled come from Meta/Google billing, not a LOOPIE
        wallet.
      </p>
      <FundingSnapshot funding={funding} />
      {hasLimit ? (
        <RecordSpendForm campaignId={campaignId} />
      ) : (
        <AmountForm
          label="Spend limit"
          submitLabel="Set spend limit"
          confirmLabel="Confirm: set spend limit"
          confirmCopy={(formatted) => `Set a ${formatted} spend limit for this campaign?`}
          variant="outline"
          defaultValue={String(funding.planningBudget || '')}
          pending={pending}
          onSubmit={onAuthorize}
        />
      )}
    </section>
  )
}
