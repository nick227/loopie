import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, useAssets, useCreateAsset, useCreateCreative } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdForm } from '@/components/ads/AdForm'
import { useFlatPages } from '@/hooks/useFlatPages'

export function CreateAdPage() {
  const navigate = useNavigate()
  const assetsQuery = useAssets()
  const createAsset = useCreateAsset()
  const createAd = useCreateCreative()
  const assets = useFlatPages(assetsQuery)
  const [name, setName] = useState('')
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  function toggle(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId],
    )
  }

  if (assetsQuery.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New ad</h1>
      <AdForm
        name={name}
        assetIds={assetIds}
        assets={assets}
        pending={createAd.isPending || createAsset.isPending}
        error={error}
        submitLabel="Save"
        onName={setName}
        onToggleAsset={toggle}
        onAddAsset={async (input) => {
          const result = await createAsset.mutateAsync(input)
          const id = result.data?.id
          if (id) setAssetIds((current) => [...current, id])
        }}
        onSubmit={async () => {
          setError(null)
          try {
            const result = await createAd.mutateAsync({ name, assetIds })
            const id = result.data?.id
            if (!id) {
              setError('Could not save ad')
              return
            }
            navigate(`/ads/${id}`)
          } catch (err) {
            setError(
              err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad',
            )
          }
        }}
      />
    </div>
  )
}
