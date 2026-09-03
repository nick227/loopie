import { useState } from 'react'
import { useQuickCreatePage } from '@/hooks/useQuickCreatePage'
import { Button } from '@/components/ui/Button'
import { CORPORATE_PROFESSIONAL_TEMPLATE_ID } from '@/pages/landing-pages/components/types'
import { STEP_COPY } from '../copy'

export function AssistantHomepageCreateStep({ onSuccess }: { onSuccess: () => void }) {
  const { create, isPending } = useQuickCreatePage()
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    const result = await create(CORPORATE_PROFESSIONAL_TEMPLATE_ID)
    if (result.ok) {
      onSuccess()
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button onClick={handleClick} loading={isPending} className="w-full">
        {STEP_COPY.homepage_create.actionLabel}
      </Button>
    </div>
  )
}
