import type { AdCreativeInput } from '@project/ad-renderer'
import { AdCreativeVisual } from '@/components/river/RiverPostPresentation'
import { cn } from '@/lib/utils'

/**
 * A real ad card, rendered through renderAdCreativeFragment — the same function every other
 * surface in the product uses for a creative (Ad Designer, River AD posts, embeds; see
 * CLAUDE.md's Ad Designer "CRITICAL RENDERING REQUIREMENT"). The copy is sample content, not a
 * real business's ad, but the rendering itself is genuine product output, not a mockup.
 */
const SAMPLE_AD: AdCreativeInput = {
  format: 'FEED_POST',
  headline: 'Spring tune-up special',
  primaryText: 'Book this week and save 15% on your first service.',
  ctaLabel: 'Get a quote',
}

export function AdMiniVisual({ className }: { className?: string }) {
  return <AdCreativeVisual adCreative={SAMPLE_AD} className={cn('max-w-[240px]', className)} />
}
