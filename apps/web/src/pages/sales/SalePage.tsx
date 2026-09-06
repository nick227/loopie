import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Undo2 } from 'lucide-react'
import { useSale, useReverseSale } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { ContactLink } from '@/components/contacts/ContactLink'
import { formatDollars } from '@/lib/money'
import { SOURCE_TYPE_LABEL } from '@/lib/sourceTypes'
import { usePageTitle } from '@/lib/headerContext'

// Sale.date is a calendar day stored as UTC midnight, not a precise instant — same rationale as
// ContactSales' saleDate: formatting in the viewer's local timezone can shift it back a day for
// anyone west of UTC.
function saleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC' })
}

function ReverseSaleButton({ saleId }: { saleId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const reverse = useReverseSale()

  async function submit() {
    try {
      await reverse.mutateAsync({ saleId, reason: reason.trim() || undefined })
      toast.success('Sale reversed')
      setConfirming(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reverse this sale.')
    }
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <Undo2 size={13} /> Reverse sale
      </Button>
    )
  }

  return (
    <div className="w-72 space-y-2 rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="text-xs text-muted-foreground">
        This reverses the recorded revenue and any commission owed on it. It can&apos;t be undone.
      </p>
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason (optional)"
        className="min-h-[50px]"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" loading={reverse.isPending} onClick={submit}>
          Confirm reversal
        </Button>
      </div>
    </div>
  )
}

export function SalePage() {
  const { saleId } = useParams<{ saleId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useSale(saleId!)
  const sale = data?.data

  usePageTitle(sale ? 'Sale' : null)

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (!sale) return <p className="text-muted-foreground">Not found.</p>

  const reversed = !!sale.reversedAt

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tabular-nums">
            <span className={reversed ? 'text-muted-foreground line-through' : 'text-foreground'}>
              {formatDollars(sale.amount)}
            </span>
            {reversed ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Reversed
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {saleDate(sale.date)} · {SOURCE_TYPE_LABEL[sale.sourceType] ?? sale.sourceType}
            {sale.productOrService ? ` · ${sale.productOrService}` : ''}
          </p>
        </div>
        {!reversed ? <ReverseSaleButton saleId={sale.id} /> : null}
      </div>

      <Card>
        <CardContent className="space-y-3 py-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <ContactLink
              contactId={sale.contactId}
              className="font-medium hover:underline underline-offset-4"
            />
          </div>
          {sale.leadId ? (
            <div>
              <p className="text-xs text-muted-foreground">Lead</p>
              <Link
                to={`/leads/${sale.leadId}`}
                className="font-medium hover:underline underline-offset-4"
              >
                View lead
              </Link>
            </div>
          ) : null}
          {sale.notes ? (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p>{sale.notes}</p>
            </div>
          ) : null}
          {reversed && sale.reversedAt ? (
            <div>
              <p className="text-xs text-muted-foreground">Reversed</p>
              <p>{new Date(sale.reversedAt).toLocaleDateString()}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
        Back to sales
      </Button>
    </div>
  )
}
