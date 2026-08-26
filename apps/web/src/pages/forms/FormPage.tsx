import { useParams } from 'react-router-dom'
import { useForm } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function FormPage() {
  const { formId } = useParams<{ formId: string }>()
  const { data, isLoading } = useForm(formId!)

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const item = data?.data
  if (!item) return <p className="text-muted-foreground">Not found.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Form</h1>
      <Card>
        <CardContent className="py-4">
          {/* TODO: replace with real fields */}
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(item, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
