import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function CopyText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-start gap-2">
      <p className="text-xs text-muted-foreground break-all flex-1">{value}</p>
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
