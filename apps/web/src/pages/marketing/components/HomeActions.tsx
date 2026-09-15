import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useCurrentUser } from '@project/sdk'
import { SiteInquiryButton } from '@/components/site-inquiry/SiteInquiryButton'

export function HomeActions() {
  const me = useCurrentUser()
  const user = me.data?.data
  const destination = user ? (user.platformRole === 'AFFILIATE' ? '/portal' : '/app') : '/register'

  return (
    <div className="flex flex-wrap items-center gap-3">
      {me.isLoading ? (
        <span
          role="status"
          className="inline-flex h-11 items-center px-6 text-sm text-muted-foreground"
        >
          Checking your account…
        </span>
      ) : (
        <Link
          to={destination}
          className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {user ? 'Open LOOPIE' : 'Create an account'}
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      )}
      <SiteInquiryButton
        triggerLabel="Talk to us"
        triggerVariant="outline"
        triggerSize="lg"
        modalTitle="Talk to us"
        description="Tell us about your business and what you need help with. A real person will follow up."
        defaultMessage="I'd like to talk about using LOOPIE for my business."
      />
    </div>
  )
}
