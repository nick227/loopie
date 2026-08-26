import { useParams, useNavigate } from 'react-router-dom'
import { useSendMessage } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function SendMessagePage() {
  const { messageId } = useParams<{ messageId: string }>()
  const navigate = useNavigate()
  const mutation = useSendMessage()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Send Message</h1>
      <Button
        onClick={async () => {
          await mutation.mutateAsync(messageId!)
          navigate(-1)
        }}
        loading={mutation.isPending}
      >
        Confirm
      </Button>
    </div>
  )
}
