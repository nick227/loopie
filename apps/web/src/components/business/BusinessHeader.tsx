import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Briefcase, LogOut, MapPin } from 'lucide-react'
import { useAsset, useBusiness, useCreateAsset, useLogout, useUpdateBusiness } from '@project/sdk'
import { toast } from 'sonner'
import { MediaPicker } from '@/components/media/MediaPicker'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { mediaSrc } from '@/lib/media'
import { Button } from '@/components/ui/Button'

export function BusinessHeader() {
  const business = useBusiness()
  const updateBusiness = useUpdateBusiness()
  const createAsset = useCreateAsset()
  const logout = useLogout()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const asset = useAsset(selectedId ?? '')

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/login', { replace: true })
  }

  async function applyLogo() {
    if (!selectedId || saving) return
    setSaving(true)
    try {
      const result = await asset.refetch()
      if (result.error) throw result.error
      const logoUrl = result.data?.data?.url
      if (!logoUrl) throw new Error('Choose an image with a valid URL.')
      await updateBusiness.mutateAsync({ logoUrl })
      setPickerOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update business image.')
    } finally {
      setSaving(false)
    }
  }

  if (business.isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />
  }

  const data = business.data?.data
  if (!data) return null

  return (
    <section className="business-header flex flex-col gap-4 rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Replace business image"
            title="Replace business image"
            className="shrink-0 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => {
              setSelectedId(undefined)
              setPickerOpen(true)
            }}
          >
            <Avatar
              src={mediaSrc(data.logoUrl)}
              name={data.name || 'Business'}
              size="lg"
              className="h-16 w-16 border border-border bg-background text-lg"
            />
          </button>
          <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
            {data.name || 'Business'}
          </h1>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{data.email}</p>
      </div>

      {data.industry || data.location ? (
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {data.industry ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Briefcase size={13} strokeWidth={1.8} />
              <span className="truncate">{data.industry}</span>
            </div>
          ) : null}
          {data.location ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPin size={13} strokeWidth={1.8} />
              <span className="truncate">{data.location}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        {data.slug ? (
          <Link
            to={`/b/${data.slug}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View public profile <ArrowUpRight size={14} />
          </Link>
        ) : null}
      </div>
      {pickerOpen ? (
        <MediaPicker
          type="IMAGE"
          single
          selectedIds={selectedId ? [selectedId] : []}
          adding={createAsset.isPending || saving}
          onToggle={(id) => {
            if (!saving) setSelectedId(id)
          }}
          onAdd={async (input) => {
            const result = await createAsset.mutateAsync(input)
            if (result.data?.id) setSelectedId(result.data.id)
          }}
          onConfirm={() => {
            void applyLogo()
          }}
          onClose={() => {
            if (!saving) setPickerOpen(false)
          }}
        />
      ) : null}

      <Button
        variant="outline"
        className="mt-5 w-full"
        loading={logout.isPending}
        onClick={handleLogout}
      >
        <LogOut size={15} />
        Sign out
      </Button>
    </section>
  )
}
