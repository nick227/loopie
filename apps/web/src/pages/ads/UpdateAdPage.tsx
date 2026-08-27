import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, useAdvertisement, useCreateAsset, useUpdateAdvertisement } from '@project/sdk'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdForm } from '@/components/ads/AdForm'

export function UpdateAdPage() {
  const { adId } = useParams<{ adId: string }>()
  const adQuery = useAdvertisement(adId!)

  if (adQuery.isLoading) return <Skeleton className="h-48 w-full" />
  const ad = adQuery.data?.data
  if (!ad) return <p className="text-muted-foreground">Not found.</p>

  return <UpdateAdForm id={ad.id} name={ad.name} assetIds={ad.assetIds} />
}

function UpdateAdForm({
  id,
  name: initialName,
  assetIds: initialIds,
}: {
  id: string
  name: string
  assetIds: string[]
}) {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()
  const updateAd = useUpdateAdvertisement()
  const [name, setName] = useState(initialName)
  const [assetIds, setAssetIds] = useState(initialIds)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit ad</h1>
      <AdForm
        name={name}
        assetIds={assetIds}
        pending={updateAd.isPending || createAsset.isPending}
        error={error}
        submitLabel="Save"
        onName={setName}
        onAssetIds={setAssetIds}
        onAddAsset={async (input) => {
          const result = await createAsset.mutateAsync(input)
          const nextId = result.data?.id
          if (nextId) setAssetIds([nextId])
        }}
        onSubmit={async () => {
          setError(null)
          try {
            const result = await updateAd.mutateAsync({ id, name, assetIds })
            const savedId = result.data?.id
            if (!savedId) {
              setError('Could not save ad')
              return
            }
            navigate(`/ads/${savedId}`)
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
