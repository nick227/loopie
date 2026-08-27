import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  useCreateAdRun,
  useCreateAdvertisement,
  useCreateAsset,
  useResumeAdRun,
} from '@project/sdk'
import { AdEditor } from '@/components/ads/AdEditor'
import { startAdRuns } from '@/lib/startAdRuns'

export function CreateAdPage() {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()
  const createAd = useCreateAdvertisement()
  const createRun = useCreateAdRun()
  const resumeRun = useResumeAdRun()
  const [name, setName] = useState('')
  const [assetIds, setAssetIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const pending =
    createAd.isPending || createAsset.isPending || createRun.isPending || resumeRun.isPending

  async function saveAd() {
    const result = await createAd.mutateAsync({ name, assetIds })
    const id = result.data?.id
    if (!id) throw new Error('Could not save ad')
    return id
  }

  return (
    <AdEditor
      heading="New ad"
      name={name}
      assetIds={assetIds}
      runs={[]}
      pending={pending}
      error={error}
      onName={setName}
      onAssetIds={setAssetIds}
      onAddAsset={async (input) => {
        const result = await createAsset.mutateAsync(input)
        const id = result.data?.id
        if (id) setAssetIds([id])
      }}
      onSave={async () => {
        setError(null)
        try {
          navigate(`/ads/${await saveAd()}`)
        } catch (err) {
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not save ad',
          )
        }
      }}
      onStartNew={async (targets) => {
        setError(null)
        let id: string | undefined
        try {
          id = await saveAd()
          await startAdRuns(id, targets, createRun.mutateAsync, resumeRun.mutateAsync)
          navigate(`/ads/${id}`)
        } catch (err) {
          if (id) {
            navigate(`/ads/${id}`)
            return
          }
          setError(
            err instanceof ApiError || err instanceof Error ? err.message : 'Could not start ad',
          )
        }
      }}
    />
  )
}
