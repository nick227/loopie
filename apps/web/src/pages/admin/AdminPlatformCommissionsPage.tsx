import { useAdminGetMoneyFlowLedger } from '@project/sdk'
import { ExportImportActions } from '@/components/ui/ExportImportActions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const formatCurrency = (minor: number) => `$${(minor / 100).toFixed(2)}`

interface MoneyFlowAggregates {
  membershipRevenueMinor: number
  affiliateEarningsMinor: number
  managerOverridesMinor: number
  payableLiabilityMinor: number
  pendingPayoutTotalMinor: number
  paidTotalMinor: number
}

interface MoneyFlowEarning {
  id: string
  type: string
  beneficiaryAffiliate: { name: string }
  rateBps: number
  amountMinor: number
  status: string
  payoutId?: string | null
}

interface MoneyFlowPayment {
  id: string
  business: { name: string }
  amountMinor: number
  settledAt: string
  earnings: MoneyFlowEarning[]
}

interface MoneyFlowPage {
  data: { aggregates: MoneyFlowAggregates; payments: MoneyFlowPayment[] }
}

export function AdminPlatformCommissionsPage() {
  const query = useAdminGetMoneyFlowLedger({}, { keepPreviousData: true })

  const pages = query.data?.pages as MoneyFlowPage[] | undefined
  const aggregates = pages?.[0]?.data?.aggregates

  const payments = pages?.flatMap((page) => page.data.payments) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Money Flow"
        description="End-to-end traceability of membership revenue and affiliate earnings."
        secondaryActions={
          <ExportImportActions
            onExportCsv={() => alert('Export CSV')}
            onExportGoogleSheets={() => alert('Export Google Sheets')}
          />
        }
      />

      {aggregates && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs text-muted-foreground uppercase">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatCurrency(aggregates.membershipRevenueMinor)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs text-muted-foreground uppercase">Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatCurrency(aggregates.affiliateEarningsMinor)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs text-muted-foreground uppercase">Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatCurrency(aggregates.managerOverridesMinor)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs text-muted-foreground uppercase text-orange-500">
                Payable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-orange-500">
                {formatCurrency(aggregates.payableLiabilityMinor)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs text-muted-foreground uppercase text-blue-500">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-blue-500">
                {formatCurrency(aggregates.pendingPayoutTotalMinor)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs text-muted-foreground uppercase text-green-600">
                Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-green-600">
                {formatCurrency(aggregates.paidTotalMinor)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {payments.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm border rounded-lg">
            No payments found.
          </div>
        )}

        {payments.map((payment: MoneyFlowPayment) => (
          <Card key={payment.id}>
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">{payment.business.name}</span>
                  <span className="text-muted-foreground ml-2">
                    · {formatCurrency(payment.amountMinor)} membership payment
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(payment.settledAt).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {payment.earnings.length === 0 && (
                <div className="text-sm text-muted-foreground">No earnings generated.</div>
              )}

              <div className="space-y-4">
                {payment.earnings.map((earning: MoneyFlowEarning) => (
                  <div key={earning.id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">
                        {earning.type === 'DIRECT' ? 'Direct affiliate' : 'Manager override'}
                      </div>
                      <div className="text-muted-foreground">
                        {earning.beneficiaryAffiliate.name} · {(earning.rateBps / 100).toFixed(2)}%
                        →{' '}
                        <span className="text-foreground font-medium">
                          {formatCurrency(earning.amountMinor)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          earning.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : earning.status === 'PAYABLE' && earning.payoutId
                              ? 'bg-purple-100 text-purple-800'
                              : earning.status === 'PAYABLE'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {earning.status === 'PAYABLE' && earning.payoutId
                          ? 'BATCHED'
                          : earning.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {query.hasNextPage && (
        <div className="pt-4 text-center">
          <button
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="text-sm text-blue-500 hover:underline"
          >
            {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
