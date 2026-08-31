import { EventPastel } from '@/components/landing-pages/templates/EventPastel'
import { eventPastelData } from '@project/db/src/data/event-pastel'

export function EventPastelPreview() {
  return (
    <div className="w-full">
      <EventPastel data={eventPastelData} />
    </div>
  )
}
