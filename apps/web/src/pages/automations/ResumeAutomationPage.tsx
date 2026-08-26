import { useParams, useNavigate } from 'react-router-dom'
import { useResumeAutomation } from '@project/sdk'
import { Button } from '@/components/ui/Button'

export function ResumeAutomationPage() {
  const { automationId } = useParams<{ automationId: string }>()
  const navigate = useNavigate()
  const mutation = useResumeAutomation()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Resume Automation</h1>
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
