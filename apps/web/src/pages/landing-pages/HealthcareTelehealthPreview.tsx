import { HealthcareTelehealth } from '@/components/landing-pages/templates/HealthcareTelehealth'
import { healthcareTelehealthData } from '@project/db/src/data/healthcare-telehealth'

export function HealthcareTelehealthPreview() {
  return (
    <div className="w-full">
      <HealthcareTelehealth data={healthcareTelehealthData} />
    </div>
  )
}
