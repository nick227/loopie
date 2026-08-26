import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, useAssets, useCreateAsset, useCreative, useUpdateCreative } from '@project/sdk'
import type { components } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdForm } from '@/components/ads/AdForm'
import { useFlatPages } from '@/hooks/useFlatPages'

type Creative = components['schemas']['Creative']

export function UpdateAdPage() {
  const { adId } = useParams<{ adId: string }>()
  const adQuery = useCreative(adId!)
  const assetsQuery = useAssets()

  if (adQuery.isLoading || assetsQuery.isLoading) return <Skeleton className="h-48 w-full" />
  const ad = adQuery.data?.data
  if (!ad) return <p className="text-muted-foreground">Not found.</p>

  return <UpdateAdForm ad={ad} />
}

function UpdateAdForm({ ad }: { ad: Creative }) {
  const navigate = useNavigate()
  const assetsQuery = useAssets()
  const createAsset = useCreateAsset()
  const updateAd = useUpdateCreative()
  const assets = useFlatPages(assetsQuery)
  const [name, setName] = useState(ad.name)
  const [assetIds, setAssetIds] = useState(ad.assetIds)
  const [error, setError] = useState<string | null>(null)

  function toggle(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId],
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit ad</h1>
      <AdForm
        name={name}
        assetIds={assetIds}
        assets={assets}
        pending={updateAd.isPending || createAsset.isPending}
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
            const result = await updateAd.mutateAsync({ creativeId: ad.id, name, assetIds })
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
