import { useState } from 'react'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'
import { Button } from '@/components/ui/Button'
import { CORPORATE_PROFESSIONAL_TEMPLATE_ID } from '@/pages/landing-pages/components/types'

export function AssistantHomepageCreateStep({ onDone }: { onDone: () => void }) {
  const { create, isPending } = useQuickCreatePage()
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    const result = await create(CORPORATE_PROFESSIONAL_TEMPLATE_ID)
    if (result.ok) {
      onDone()
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        We&apos;ll set up a homepage from a template you can edit right after.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button onClick={handleClick} size="sm" loading={isPending} className="w-full">
        Create homepage
      </Button>
    </div>
  )
}
