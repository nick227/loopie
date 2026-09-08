import { useState } from 'react'
import {
  useAdminGetPayableEarningsSummary,
  useAdminListPlatformAffiliatePayouts,
  useAdminSettlePlatformAffiliatePayout,
  useAdminCreatePlatformAffiliatePayout,
  useAdminFailPlatformAffiliatePayout,
  useAdminGetPlatformAffiliateReconciliation,
} from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Check, Plus, ChevronDown, ChevronUp, X, Undo2, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { ExportImportActions } from '@/components/ui/ExportImportActions'

interface PayableEarningsSummary {
  affiliateId: string
  affiliateName: string
  totalAmountMinor: number
  earningIds: string[]
}

interface PlatformAffiliateEarning {
  id: string
  amountMinor: number
  type: string
  status: string
}

interface PlatformAffiliatePayout {
  id: string
  affiliateId: string
  totalAmountMinor: number
  currency: string
  status: string
  createdAt: string
  affiliate?: { name?: string | null } | null
  earnings?: PlatformAffiliateEarning[]
}

interface ReconciliationData {
  membershipRevenueMinor: number
  membershipPaymentCount: number
  unbatchedPayableMinor: number
  unbatchedPayableCount: number
  discrepancies: {
    orphanedPayments: { id: string; businessId: string; amountMinor: number; settledAt: string }[]
    reversedEarningsWithoutReason: number
  }
}

export function AdminPlatformPayoutsPage() {
  const { data: payoutsData, isLoading: payoutsLoading } = useAdminListPlatformAffiliatePayouts({
    limit: 50,
  })
  const { data: summaryData, isLoading: summaryLoading } = useAdminGetPayableEarningsSummary()
  const { data: reconciliationData } = useAdminGetPlatformAffiliateReconciliation()

  const settlePayout = useAdminSettlePlatformAffiliatePayout()
  const failPayout = useAdminFailPlatformAffiliatePayout()
  const createPayout = useAdminCreatePlatformAffiliatePayout()
  const queryClient = useQueryClient()

  const [previewSummary, setPreviewSummary] = useState<PayableEarningsSummary | null>(null)
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null)

  if (payoutsLoading || summaryLoading) return <Skeleton className="h-[400px] w-full" />

  const payouts =
    (payoutsData?.pages as { data: PlatformAffiliatePayout[] }[] | undefined)?.flatMap(
      (p) => p.data,
    ) ?? []
  const summaries = (summaryData as { data?: PayableEarningsSummary[] } | undefined)?.data ?? []
  const reconciliation = (reconciliationData as { data?: ReconciliationData } | undefined)?.data

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminListPlatformAffiliatePayouts'] })
    queryClient.invalidateQueries({ queryKey: ['adminGetPayableEarningsSummary'] })
    queryClient.invalidateQueries({ queryKey: ['adminGetPlatformAffiliateReconciliation'] })
  }

  const handleSettle = async (id: string) => {
    if (confirm('Mark this payout as settled via external transfer?')) {
      await settlePayout.mutateAsync({ id })
      invalidate()
    }
  }

  const handleFail = async (id: string, outcome: 'FAILED' | 'REVERSED') => {
    const prompt =
      outcome === 'FAILED'
        ? 'Fail this payout batch? Its earnings return to payable for a future batch.'
        : 'Reverse this already-settled payout? Use this only if the external transfer bounced or was clawed back.'
    if (confirm(prompt)) {
      await failPayout.mutateAsync({ id, outcome })
      invalidate()
    }
  }

  const handleConfirmBatch = async () => {
    if (!previewSummary) return
    await createPayout.mutateAsync({
      affiliateId: previewSummary.affiliateId,
      earningIds: previewSummary.earningIds,
    })
    invalidate()
    setPreviewSummary(null)
  }

  return (
    <div className="space-y-6 relative">
      <PageHeader
        variant="list"
        title="Payout Execution"
        description="Group payable earnings into payout batches and settle them."
        secondaryActions={<ExportImportActions onExportCsv={() => alert('Export CSV')} />}
      />

      {previewSummary && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle>Confirm Payout Batch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Beneficiary</span>
                <span className="font-medium">{previewSummary.affiliateName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Earnings included</span>
                <span className="font-medium">{previewSummary.earningIds.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-semibold text-green-600">
                  ${(previewSummary.totalAmountMinor / 100).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                This will lock these earnings into a new BATCHED payout. You must still execute the
                external transfer and click &ldquo;Settle&rdquo; to mark it paid.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewSummary(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmBatch} disabled={createPayout.isPending}>
                {createPayout.isPending ? 'Batching...' : 'Create Batch'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {reconciliation && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs uppercase">Membership revenue</div>
                <div className="font-semibold">
                  ${(reconciliation.membershipRevenueMinor / 100).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {reconciliation.membershipPaymentCount} payments
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Unbatched payable</div>
                <div className="font-semibold">
                  ${(reconciliation.unbatchedPayableMinor / 100).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {reconciliation.unbatchedPayableCount} earnings
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Orphaned payments</div>
                <div
                  className={`font-semibold ${reconciliation.discrepancies.orphanedPayments.length > 0 ? 'text-amber-600' : ''}`}
                >
                  {reconciliation.discrepancies.orphanedPayments.length}
                </div>
                <div className="text-xs text-muted-foreground">no earnings despite ACTIVE</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Reversed earnings</div>
                <div className="font-semibold">
                  {reconciliation.discrepancies.reversedEarningsWithoutReason}
                </div>
                <div className="text-xs text-muted-foreground">total on file</div>
              </div>
            </div>
            {reconciliation.discrepancies.orphanedPayments.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {reconciliation.discrepancies.orphanedPayments.length} membership payment(s) on an
                  actively-attributed business produced no earning — worth a manual look.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payable Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {summaries.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No payable earnings found.
              </div>
            )}
            {summaries.map((summary: PayableEarningsSummary) => (
              <UniversalRow
                key={summary.affiliateId}
                title={summary.affiliateName}
                subtitle={`${summary.earningIds.length} payable earnings`}
                trailing={
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      ${(summary.totalAmountMinor / 100).toFixed(2)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 h-7 text-xs"
                      onClick={() => setPreviewSummary(summary)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Preview Batch
                    </Button>
                  </div>
                }
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payout Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {payouts.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No payouts generated yet.
              </div>
            )}
            {payouts.map((payout: PlatformAffiliatePayout) => (
              <div key={payout.id} className="border-b last:border-0">
                <UniversalRow
                  title={payout.affiliate?.name ?? payout.affiliateId}
                  subtitle={new Date(payout.createdAt).toLocaleDateString()}
                  meta={
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${payout.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}
                    >
                      {payout.status === 'PENDING' ? 'BATCHED' : payout.status}
                    </span>
                  }
                  trailing={
                    <div className="text-right flex items-center justify-end gap-3">
                      <div className="font-semibold">
                        ${(payout.totalAmountMinor / 100).toFixed(2)}
                      </div>
                      {payout.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSettle(payout.id)}
                            disabled={settlePayout.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Settle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive"
                            onClick={() => handleFail(payout.id, 'FAILED')}
                            disabled={failPayout.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Fail
                          </Button>
                        </>
                      )}
                      {payout.status === 'PAID' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive"
                          onClick={() => handleFail(payout.id, 'REVERSED')}
                          disabled={failPayout.isPending}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Reverse
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          setExpandedPayoutId(expandedPayoutId === payout.id ? null : payout.id)
                        }
                      >
                        {expandedPayoutId === payout.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  }
                />
                {expandedPayoutId === payout.id && payout.earnings && (
                  <div className="bg-muted/30 p-4 border-t text-sm">
                    <div className="font-medium mb-3 text-muted-foreground uppercase text-xs">
                      Included Earnings ({payout.earnings.length})
                    </div>
                    <div className="space-y-2">
                      {payout.earnings.map((e) => (
                        <div key={e.id} className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {e.type === 'DIRECT' ? 'Direct' : 'Manager Override'}
                          </span>
                          <span className="font-medium">${(e.amountMinor / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
