import { AppWaitlistNeon } from '@/components/landing-pages/templates/AppWaitlistNeon'
import { appWaitlistNeonData } from '@/data/app-waitlist-neon'

export function AppWaitlistNeonPreview() {
  return (
    <div className="w-full">
      <AppWaitlistNeon data={appWaitlistNeonData} />
    </div>
  )
}
