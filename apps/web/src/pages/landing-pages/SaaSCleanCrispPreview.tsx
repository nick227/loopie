import { SaaSCleanCrisp } from '@/components/landing-pages/templates/SaaSCleanCrisp'
import { saasCleanCrispData } from '@/data/saas-clean-crisp'

export function SaaSCleanCrispPreview() {
  return (
    <div className="w-full">
      <SaaSCleanCrisp data={saasCleanCrispData} />
    </div>
  )
}
