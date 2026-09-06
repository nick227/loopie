import React, { useState } from 'react'
import { Plus, Settings2, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAdminHouseAds, useDeleteHouseAd, useUpdateHouseAd, type HouseAd } from '@project/sdk'
import { AdminHouseAdEditor } from './AdminHouseAdEditor'

export function AdminHouseAdsPage() {
  const { data: adsResponse, isLoading } = useAdminHouseAds()
  const updateAd = useUpdateHouseAd()
  const deleteAd = useDeleteHouseAd()
  const [editingAd, setEditingAd] = useState<HouseAd | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const ads = adsResponse?.data || []

  const handleEdit = (ad: HouseAd) => {
    setEditingAd(ad)
    setIsEditorOpen(true)
  }

  const handleCreate = () => {
    setEditingAd(null)
    setIsEditorOpen(true)
  }

  const handleToggleStatus = (ad: HouseAd) => {
    const newStatus = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    updateAd.mutate({ id: ad.id, data: { status: newStatus } })
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      <PageHeader
        variant="list"
        title="House Ads"
        description="Manage internal ad placements and WordPress embeds across the platform."
        primaryAction={
          <Button onClick={handleCreate} className="gap-2">
            <Plus size={16} />
            New House Ad
          </Button>
        }
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Ad Name</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Weight</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Loading ads...
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No house ads found. Create one to get started.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{ad.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-secondary rounded text-xs font-medium text-secondary-foreground">
                        {ad.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(ad)}
                        disabled={updateAd.isPending}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          ad.status === 'ACTIVE' ? 'bg-primary' : 'bg-muted'
                        } ${updateAd.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                            ad.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`ml-3 text-xs font-medium ${ad.status === 'ACTIVE' ? 'text-green-500' : 'text-muted-foreground'}`}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{ad.weight}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ad)}>
                          <Settings2
                            size={16}
                            className="text-muted-foreground hover:text-foreground"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this ad?')) {
                              deleteAd.mutate(ad.id)
                            }
                          }}
                        >
                          <Trash2
                            size={16}
                            className="text-destructive opacity-70 hover:opacity-100"
                          />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditorOpen && (
        <AdminHouseAdEditor initialData={editingAd} onClose={() => setIsEditorOpen(false)} />
      )}
    </div>
  )
}
