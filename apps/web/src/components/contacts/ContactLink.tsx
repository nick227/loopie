import { Link } from 'react-router-dom'
import { useContact } from '@project/sdk'

// Lead/Sale only carry a contactId — this resolves it to a name for list rows and detail
// headers, the same "click through to the Contact, don't build a parallel view" pattern
// CampaignLeadRow already uses (there contactName comes pre-joined by the read model).
export function ContactLink({ contactId, className }: { contactId: string; className?: string }) {
  const { data, isLoading } = useContact(contactId)
  const name = data?.data?.name

  return (
    <Link
      to={`/contacts/${contactId}`}
      className={className ?? 'hover:underline underline-offset-4'}
    >
      {isLoading ? 'Loading…' : (name ?? 'Unknown contact')}
    </Link>
  )
}
