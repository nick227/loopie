import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SiteInquiryButton } from '@/components/site-inquiry/SiteInquiryButton'

export function CtaBand() {
  return (
    <section className="rounded-2xl bg-foreground px-6 py-16 text-background sm:px-10 sm:py-20">
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Ready to put it all in one place?
      </h2>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link to="/register">
          <Button
            size="lg"
            variant="outline"
            className="border-background text-background hover:bg-background hover:text-foreground"
          >
            Get started
          </Button>
        </Link>
        <SiteInquiryButton
          triggerLabel="Talk to us"
          triggerVariant="ghost"
          triggerSize="lg"
          triggerClassName="text-background hover:bg-background/10 hover:text-background"
          modalTitle="Talk to us"
          description="Tell us about your business and what you're trying to do. A real person will follow up."
          defaultMessage="I'd like to talk about using LOOPIE for my business."
        />
      </div>
    </section>
  )
}
