import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { getApiClient } from '@project/sdk'
import { useMutation } from '@tanstack/react-query'
import { FORMAT_ASPECT_RATIO, type AdCreativeFormat } from '@project/ad-renderer'
import { AD_SERVER_URL } from '@/lib/adPlatformConfig'

interface EmbedModalProps {
  isOpen: boolean
  onClose: () => void
  objectType: 'PAGE' | 'ADVERTISEMENT'
  objectId: string
}

type EmbedDeploymentResult = {
  publicId: string
  format?: AdCreativeFormat | null
}

function hostAspectRatio(objectType: 'PAGE' | 'ADVERTISEMENT', format?: AdCreativeFormat | null) {
  if (objectType === 'PAGE') return '16 / 9'
  const key = (format ?? 'FEED_POST') as AdCreativeFormat
  return FORMAT_ASPECT_RATIO[key] ?? FORMAT_ASPECT_RATIO.FEED_POST
}

export function EmbedModal({ isOpen, onClose, objectType, objectId }: EmbedModalProps) {
  const [copied, setCopied] = useState(false)

  const {
    mutate,
    data: deployment,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (): Promise<EmbedDeploymentResult> => {
      const client = getApiClient()

      // AdEditor has no separate Publish control — freeze the current draft into a published
      // snapshot before minting/promoting the embed deployment so the snippet always reflects
      // the media/CTA/headline the user just edited (not a stale prior version).
      if (objectType === 'ADVERTISEMENT') {
        const { error: publishError } = await client.POST(
          '/advertisements/{advertisementId}/publish',
          {
            params: { path: { advertisementId: objectId } },
            body: {},
          },
        )
        if (publishError) {
          const errorData = publishError as { error?: string; message?: string }
          throw new Error(errorData.error || errorData.message || 'Failed to publish advertisement')
        }
      }

      const { data, error: apiError } = await client.POST('/embed-deployments/get-or-create', {
        body: { objectType, objectId },
      })

      if (apiError) {
        const errorData = apiError as { error?: string; message?: string }
        throw new Error(errorData.error || errorData.message || 'Failed to generate embed code')
      }

      const result = data?.data as EmbedDeploymentResult | undefined
      if (!result?.publicId) throw new Error('Failed to generate embed code')
      return result
    },
  })

  useEffect(() => {
    if (isOpen) {
      mutate()
    }
  }, [isOpen, objectType, objectId, mutate])

  const aspect = hostAspectRatio(objectType, deployment?.format)
  const buildEmbedCode = (publicId: string) => {
    return `<script src="${AD_SERVER_URL}/v1.js" async></script>
<div class="loopie-embed" data-public-id="${publicId}" style="width:100%;max-width:400px;aspect-ratio:${aspect};"></div>`
  }

  const embedCode = deployment?.publicId ? buildEmbedCode(deployment.publicId) : ''

  const handleCopy = () => {
    if (!embedCode) return
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <Modal title="Embed" onClose={onClose} size="xl">
      <div className="p-5 sm:p-6 flex flex-col min-h-[250px] max-w-2xl mx-auto">
        {isPending && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Preparing embed code...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-base font-medium">Unable to create embed</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}

        {deployment && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">Embed code</span>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copied ? <span className="text-success">Copied</span> : 'Copy code'}
                </button>
              </div>

              <pre className="max-h-[300px] overflow-auto p-4 text-[13px] leading-6 text-foreground font-mono whitespace-pre-wrap break-all">
                <code>{embedCode}</code>
              </pre>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste on any site. The slot is capped at 400px wide with the creative&apos;s aspect
              ratio. Opening Embed publishes the current draft so the snippet stays in sync.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
