import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useMessage, useSendMessage } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiError'

// SOCIAL has no live publishing integration — V1 is deliberately compose/draft-only (see
// CLAUDE.md). "Send" for a social message really means "I posted this myself, log it" — the
// copy below says so explicitly rather than implying LOOPIE published it automatically.
export function SendMessagePage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const mutation = useSendMessage()
  const { data } = useMessage(messageId!)
  const isSocial = data?.data?.channel === 'SOCIAL'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{isSocial ? 'Mark as Posted' : 'Send Message'}</h1>
      {isSocial && (
        <p className="text-sm text-muted-foreground">
          LOOPIE doesn&apos;t post to social platforms automatically yet. Publish this content
          yourself, then confirm here to log it as posted.
        </p>
      )}
      <Button
        onClick={async () => {
          try {
            await mutation.mutateAsync(messageId!)
            navigate(-1)
          } catch (error) {
            // A failed delivery (e.g. the email provider isn't configured) must be visible,
            // not swallowed — the message stays DRAFT/FAILED server-side either way.
            toast.error(apiErrorMessage(error, 'Could not send this message.'))
          }
        }}
        loading={mutation.isPending}
      >
        {isSocial ? "I've Posted This" : 'Confirm'}
      </Button>
    </div>
  )
}
