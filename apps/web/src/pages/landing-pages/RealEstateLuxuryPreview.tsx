import { RealEstateLuxury } from '@/components/landing-pages/templates/RealEstateLuxury'
import { realEstateLuxuryData } from '@/data/real-estate-luxury'

export function RealEstateLuxuryPreview() {
  return (
    <div className="w-full">
      <RealEstateLuxury data={realEstateLuxuryData} />
    </div>
  )
}
