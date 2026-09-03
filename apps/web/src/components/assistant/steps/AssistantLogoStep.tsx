import { useBusiness, useUpdateBusiness } from '@project/sdk'
import { BusinessLogoField } from '@/components/business/BusinessLogoField'
import { Spinner } from '@/components/ui/Spinner'

export function AssistantLogoStep({ onSuccess }: { onSuccess: () => void }) {
  const business = useBusiness()
  const updateBusiness = useUpdateBusiness()

  if (business.isLoading || !business.data?.data) {
    return <Spinner size="sm" />
  }

  async function handleChange(logoUrl: string | null) {
    if (!logoUrl) return
    await updateBusiness.mutateAsync({ logoUrl })
    onSuccess()
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <BusinessLogoField
        name={business.data.data.name}
        logoUrl={business.data.data.logoUrl ?? null}
        onChange={handleChange}
      />
      <p className="text-xs text-muted-foreground">Tap to upload a logo</p>
    </div>
  )
}
