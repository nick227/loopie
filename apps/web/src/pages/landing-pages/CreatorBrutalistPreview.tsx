import { CreatorBrutalist } from '@/components/landing-pages/templates/CreatorBrutalist'
import { creatorBrutalistData } from '@/data/creator-brutalist'

export function CreatorBrutalistPreview() {
  return (
    <div className="w-full">
      <CreatorBrutalist data={creatorBrutalistData} />
    </div>
  )
}
