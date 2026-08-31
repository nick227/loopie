import { AgencyOrganic } from '@/components/landing-pages/templates/AgencyOrganic'
import { agencyOrganicData } from '@project/db/src/data/agency-organic'

export function AgencyOrganicPreview() {
  return (
    <div className="w-full">
      <AgencyOrganic data={agencyOrganicData} />
    </div>
  )
}
