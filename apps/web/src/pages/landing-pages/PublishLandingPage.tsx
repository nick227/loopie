import { useParams, useNavigate } from 'react-router-dom'
import { usePublishLandingPage } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function PublishLandingPage() {
  const { landingPageId } = useParams<{ landingPageId: string }>()
  const navigate = useNavigate()
  const mutation = usePublishLandingPage()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Publish Landing</h1>
      <Button
        onClick={async () => {
          await mutation.mutateAsync(landingPageId!)
          navigate(-1)
        }}
        loading={mutation.isPending}
      >
        Confirm
      </Button>
    </div>
  )
}
