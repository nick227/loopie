import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { useDeleteTemplate, useTemplate } from '@project/sdk'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import { CHANNEL_ICON, CHANNEL_LABEL } from '@/components/messages/MessageRow'

export function TemplatePage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useTemplate(templateId!)
  const deleteTemplate = useDeleteTemplate()

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const template = data?.data
  if (!template) return <p className="text-muted-foreground">Not found.</p>

  const Icon = CHANNEL_ICON[template.channel] ?? CHANNEL_ICON.EMAIL!

  async function onDelete() {
    if (!confirm(`Delete "${template!.name}"? This cannot be undone.`)) return
    try {
      await deleteTemplate.mutateAsync(templateId!)
      toast.success('Template deleted')
      navigate('/templates')
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete this template.'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Icon size={20} className="text-primary" />
            {template.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {CHANNEL_LABEL[template.channel] ?? template.channel}
            {template.purpose ? ` · ${template.purpose}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link to={`/templates/${template.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil size={13} /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4 text-sm">
          {template.subject?.trim() ? (
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">{template.subject}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">Body</p>
            <p className="whitespace-pre-wrap">{template.body}</p>
          </div>
          {template.cta ? (
            <div>
              <p className="text-xs text-muted-foreground">Call to action</p>
              <p className="font-medium">{template.cta}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Button variant="destructive" size="sm" loading={deleteTemplate.isPending} onClick={onDelete}>
        <Trash2 size={13} /> Delete template
      </Button>

      <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
        Back to templates
      </Button>
    </div>
  )
}
