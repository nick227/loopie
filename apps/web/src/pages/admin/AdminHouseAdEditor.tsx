import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useCreateHouseAd, useUpdateHouseAd, useSearchAdvertisements, HouseAd } from '@project/sdk'

interface AdminHouseAdEditorProps {
  initialData: HouseAd | null
  onClose: () => void
}

const AVAILABLE_ZONES = ['HOUSE_AD']

export function AdminHouseAdEditor({ initialData, onClose }: AdminHouseAdEditorProps) {
  const createAd = useCreateHouseAd()
  const updateAd = useUpdateHouseAd()

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'WORDPRESS_EMBED',
    advertisementId: initialData?.advertisementId || '',
    scriptUrl: initialData?.scriptUrl || '',
    imageUrl: initialData?.imageUrl || '',
    targetUrl: initialData?.targetUrl || '',
    weight: initialData?.weight || 1,
    status: initialData?.status || 'ACTIVE',
    placements: initialData?.placements?.map((p) => p.zone ?? '') || ['HOUSE_AD'],
  })

  const [searchQuery, setSearchQuery] = useState('')
  const { data: searchResults, isLoading: isSearching } = useSearchAdvertisements(searchQuery)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      placements: formData.placements.map((zone: string) => ({ zone })),
    }

    if (initialData?.id) {
      updateAd.mutate({ id: initialData.id, data: payload }, { onSuccess: onClose })
    } else {
      createAd.mutate(payload, { onSuccess: onClose })
    }
  }

  const togglePlacement = (zone: string) => {
    setFormData((prev) => ({
      ...prev,
      placements: prev.placements.includes(zone)
        ? prev.placements.filter((z) => z !== zone)
        : [...prev.placements, zone],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-2xl border shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <h2 className="text-xl font-semibold text-foreground">
            {initialData ? 'Edit House Ad' : 'New House Ad'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full -mr-2 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="ad-editor-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Ad Name</label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as HouseAd['type'],
                  })
                }
              >
                <option value="WORDPRESS_EMBED">WordPress Embed (External Script)</option>
                <option value="INTERNAL">Internal Banner</option>
              </select>
            </div>

            {formData.type === 'WORDPRESS_EMBED' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Script URL</label>
                <input
                  required
                  type="url"
                  placeholder="https://hatsyshirtsy.com/wp-admin/admin-post.php..."
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.scriptUrl}
                  onChange={(e) => setFormData({ ...formData, scriptUrl: e.target.value })}
                />
              </div>
            )}

            {formData.type === 'INTERNAL' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Link to Public User Ad (Optional)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Search and select an actual live public user advertisement to feature.
                  </p>

                  {formData.advertisementId ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/30">
                      <div className="text-sm">
                        <span className="font-medium">
                          {initialData?.advertisement?.name || 'Selected Ad'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, advertisementId: '' })}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search ads by name or business..."
                        className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto bg-surface">
                          {isSearching ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              Searching...
                            </div>
                          ) : searchResults?.data && searchResults.data.length > 0 ? (
                            searchResults.data.map(
                              (ad: {
                                id: string
                                name: string
                                business?: { name?: string } | null
                              }) => (
                                <button
                                  key={ad.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                                  onClick={() => {
                                    setFormData({ ...formData, advertisementId: ad.id })
                                    setSearchQuery('')
                                  }}
                                >
                                  <div className="font-medium">{ad.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {ad.business?.name}
                                  </div>
                                </button>
                              ),
                            )
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              No ads found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!formData.advertisementId && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Image URL (Fallback)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.png"
                        className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        Target URL (Fallback Click Destination)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/landing"
                        className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={formData.targetUrl}
                        onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Weight (Priority)</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as HouseAd['status'],
                    })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground block">Placements</label>
              <div className="flex flex-col gap-2">
                {AVAILABLE_ZONES.map((zone) => (
                  <label
                    key={zone}
                    className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary/50"
                      checked={formData.placements.includes(zone)}
                      onChange={() => togglePlacement(zone)}
                    />
                    {zone}
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="ad-editor-form"
            disabled={createAd.isPending || updateAd.isPending}
          >
            {initialData ? 'Save Changes' : 'Create Ad'}
          </Button>
        </div>
      </div>
    </div>
  )
}
