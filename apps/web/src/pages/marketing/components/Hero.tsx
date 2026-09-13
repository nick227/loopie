import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { SiteInquiryButton } from '@/components/site-inquiry/SiteInquiryButton'
import { HeroProductComposition } from './HeroProductComposition'

export function Hero() {
  return (
    <section className="pt-6">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Run the work that brings in customers and turns them into sales.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Create ads and pages, capture leads, manage customer relationships, follow up, and keep
            the work moving.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/register">
              <Button size="lg">Get started</Button>
            </Link>
            <SiteInquiryButton
              triggerLabel="Talk to us"
              triggerVariant="outline"
              triggerSize="lg"
              modalTitle="Talk to us"
              description="Tell us about your business and what you're trying to do. A real person will follow up."
              defaultMessage="I'd like to talk about using LOOPIE for my business."
            />
          </div>
        </div>
        <HeroProductComposition />
      </div>
    </section>
  )
}
