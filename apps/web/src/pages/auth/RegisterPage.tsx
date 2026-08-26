import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useRegister } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Card, CardContent } from '@/components/ui/Card'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(1).max(120),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'email', label: 'Email', type: 'email', voice: false, required: true },
  { name: 'password', label: 'Password', type: 'password', voice: false, required: true },
  { name: 'businessName', label: 'Business Name', type: 'text', voice: false, required: true },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const mutation = useRegister()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create Account</h1>
        </div>
        <Card>
          <CardContent className="py-6">
            <Form<FormData>
              fields={fields}
              schema={schema}
              onSubmit={async (data) => {
                await mutation.mutateAsync(data)
                navigate('/')
              }}
              isLoading={mutation.isPending}
              submitLabel="Create Account"
            />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
