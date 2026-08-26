import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useLogin } from '@project/sdk'
import { Form } from '@/components/ui/Form'
import { Card, CardContent } from '@/components/ui/Card'
import type { FieldConfig } from '@/components/ui/Form'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
type FormData = z.infer<typeof schema>

const fields: FieldConfig[] = [
  { name: 'email', label: 'Email', type: 'email', voice: false, required: true },
  { name: 'password', label: 'Password', type: 'password', voice: false, required: true },
]

export function LoginPage() {
  const navigate = useNavigate()
  const mutation = useLogin()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sign In</h1>
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
              submitLabel="Sign In"
            />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
