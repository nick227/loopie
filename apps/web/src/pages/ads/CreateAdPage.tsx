import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, useCreateAdRun, useCreateAdvertisement, useCreateAsset } from '@project/sdk'
import { AdForm } from '@/components/ads/AdForm'

export function CreateAdPage() {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()
  const createAd = useCreateAdvertisement()
  const createRun = useCreateAdRun()
  const [name, setName] = useState('')
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const pending = createAd.isPending || createAsset.isPending || createRun.isPending

  async function saveAd() {
    const result = await createAd.mutateAsync({ name, assetIds })
    const id = result.data?.id
    if (!id) throw new Error('Could not save ad')
    return id
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New ad</h1>
      <AdForm
        name={name}
        assetIds={assetIds}
        pending={pending}
        error={error}
        submitLabel="Save"
        onName={setName}
        onAssetIds={setAssetIds}
        onAddAsset={async (input) => {
          const result = await createAsset.mutateAsync(input)
          const id = result.data?.id
          if (id) setAssetIds([id])
        }}
        onSubmit={async () => {
          setError(null)
          try {
            navigate(`/ads/${await saveAd()}`)
          } catch (err) {
            setError(
              err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad',
            )
          }
        }}
        onPostNow={async ({ targets, budget }) => {
          setError(null)
          try {
            const id = await saveAd()
            for (const target of targets) {
              await createRun.mutateAsync({
                advertisementId: id,
                platform: target.platform,
                placement: target.placement,
                budget,
                idempotencyKey: crypto.randomUUID(),
              })
            }
            navigate(`/ads/${id}`)
          } catch (err) {
            setError(
              err instanceof ApiError || err instanceof Error ? err.message : 'Could not post ad',
            )
          }
        }}
      />
    </div>
  )
}
