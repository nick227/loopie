import { useAdUnits, useCampaigns, useCreatives } from '@project/sdk'
import { useFlatPages } from '@/hooks/useFlatPages'

export function useAdCatalog() {
  const unitsQuery = useAdUnits({ limit: 100 })
  const creativesQuery = useCreatives({ limit: 100 })
  const campaignsQuery = useCampaigns({ limit: 100 })
  const units = useFlatPages(unitsQuery)
  const creatives = useFlatPages(creativesQuery)
  const campaigns = useFlatPages(campaignsQuery)
  const creativeName = new Map(creatives.map((row) => [row.id, row.name]))
  const campaignName = new Map(campaigns.map((row) => [row.id, row.name]))
  return {
    units,
    loading: unitsQuery.isLoading || creativesQuery.isLoading || campaignsQuery.isLoading,
    failed: unitsQuery.isError || creativesQuery.isError || campaignsQuery.isError,
    labelFor(unit: (typeof units)[number]) {
      return `${creativeName.get(unit.creativeId) ?? unit.creativeId} · ${campaignName.get(unit.campaignId) ?? 'Campaign'} · ${unit.status}`
    },
  }
}
