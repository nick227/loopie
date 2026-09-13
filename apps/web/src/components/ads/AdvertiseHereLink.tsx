import { SiteInquiryButton } from '@/components/site-inquiry/SiteInquiryButton'

export function AdvertiseHereLink({ className }: { className?: string }) {
  return (
    <SiteInquiryButton
      triggerLabel="Advertise here"
      plainTrigger
      triggerClassName={className}
      modalTitle="Advertise here"
      description="Tell us a little about what you have in mind. We’d love to help."
      defaultMessage="Interested in advertising!"
    />
  )
}
