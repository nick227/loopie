import { useSearchParams, useNavigate } from 'react-router-dom'
import { useActivityItem, useUpdateAttentionItem } from '@project/sdk'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { X, ExternalLink } from 'lucide-react'

export function ActivityInspector() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const inspectId = searchParams.get('inspect')

  const { data: item, isLoading } = useActivityItem(inspectId || '')
  const updateAttention = useUpdateAttentionItem()

  if (!inspectId) return null

  const close = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('inspect')
    setSearchParams(next)
  }

  return (
    <Card className="h-full flex flex-col rounded-none border-y-0 border-r-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
        <CardTitle className="text-base font-semibold">Details</CardTitle>
        <Button variant="ghost" size="icon" onClick={close} className="-mr-2">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : item?.data ? (
          <>
            <div>
              <h3 className="font-semibold text-lg">{item.data.summary}</h3>
              {item.data.detail && (
                <p className="text-sm text-muted-foreground mt-2">{item.data.detail}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                  Source
                </div>
                <div>{item.data.source.label}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                  Time
                </div>
                <div>
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(item.data.occurredAt))}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                  Type
                </div>
                <div className="font-mono text-xs p-1 bg-muted rounded inline-block">
                  {item.data.type}
                </div>
              </div>
              {item.data.actor?.label && (
                <div>
                  <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                    Actor
                  </div>
                  <div>{item.data.actor.label}</div>
                </div>
              )}
            </div>

            {/* Related Object Deep Links */}
            <div className="space-y-2 border-t pt-4">
              <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                Related
              </div>
              {item.data.references?.leadId && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/contacts/${item.data.references?.leadId}`)}
                  className="w-full justify-between"
                >
                  View Lead <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
              {item.data.references?.adId && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ads/${item.data.references?.adId}`)}
                  className="w-full justify-between"
                >
                  View Advertisement <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
              {item.data.references?.pageId && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/landing-pages/${item.data.references?.pageId}`)}
                  className="w-full justify-between"
                >
                  View Landing Page <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
              {item.data.references?.saleId && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/sales/${item.data.references?.saleId}`)}
                  className="w-full justify-between"
                >
                  View Sale <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
              {item.data.references?.runId && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/automations/runs/${item.data.references?.runId}`)}
                  className="w-full justify-between"
                >
                  View Automation Run <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
              {item.data.references?.messageId && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/messages/${item.data.references?.messageId}`)}
                  className="w-full justify-between"
                >
                  View Message <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              )}
            </div>

            {/* Attention State / Actions */}
            {item.data.attentionItem && (
              <div className="space-y-3 border-t pt-4">
                <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                  Action Required
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm">
                    Current State:{' '}
                    <span className="font-semibold">{item.data.attentionItem.state}</span>
                  </div>

                  {item.data.attentionItem.state !== 'RESOLVED' && (
                    <Button
                      onClick={() =>
                        updateAttention.mutate({
                          attentionId: item.data!.attentionItem!.id,
                          state: 'RESOLVED',
                        })
                      }
                      disabled={updateAttention.isPending}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {item.data.attentionItem.state !== 'SNOOZED' &&
                    item.data.attentionItem.state !== 'RESOLVED' && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateAttention.mutate({
                            attentionId: item.data!.attentionItem!.id,
                            state: 'SNOOZED',
                            // Snooze for 1 day for demo purposes
                            snoozedUntil: new Date(Date.now() + 86400000).toISOString(),
                          })
                        }
                        disabled={updateAttention.isPending}
                      >
                        Snooze 24h
                      </Button>
                    )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">Item not found</div>
        )}
      </CardContent>
    </Card>
  )
}
