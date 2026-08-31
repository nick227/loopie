import { EcommerceGradient } from '@/components/landing-pages/templates/EcommerceGradient'
import { ecommerceGradientData } from '@/data/ecommerce-gradient'

export function EcommerceGradientPreview() {
  return (
    <div className="w-full">
      <EcommerceGradient data={ecommerceGradientData} />
    </div>
  )
}
