import { useParams, useNavigate } from 'react-router-dom'
import { usePauseAutomation } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function PauseAutomationPage() {
  const { automationId } = useParams<{ automationId: string }>()
  const navigate = useNavigate()
  const mutation = usePauseAutomation()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pause Automation</h1>
      <Button
        onClick={async () => {
          await mutation.mutateAsync(automationId!)
          navigate(-1)
        }}
        loading={mutation.isPending}
      >
        Confirm
      </Button>
    </div>
  )
}
