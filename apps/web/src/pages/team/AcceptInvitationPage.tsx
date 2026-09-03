import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAcceptInvitation, useCurrentUser, useInvitation } from '@project/sdk'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

export function AcceptInvitationPage() {
  const { token = '' } = useParams()
  const me = useCurrentUser()
  const invitation = useInvitation(token)
  const accept = useAcceptInvitation()
  const navigate = useNavigate()
  const preview = invitation.data?.data

  async function onAccept() {
    await accept.mutateAsync(token)
    navigate('/profile', { replace: true })
  }

  if (invitation.isLoading) return <Skeleton className="mx-auto mt-16 h-48 max-w-lg" />

  if (invitation.isError || !preview) {
    return (
      <div className="mx-auto mt-16 max-w-lg space-y-3 p-6">
        <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This invite may have expired or already been used.
        </p>
        <Link to="/profile" className="text-sm underline">
          Go to profile
        </Link>
      </div>
    )
  }

  const loggedIn = Boolean(me.data?.data)
  const emailMatch = me.data?.data?.email?.toLowerCase() === preview.email.toLowerCase()

  return (
    <div className="mx-auto mt-16 max-w-lg space-y-6 p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Team invitation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{preview.businessName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invited as {preview.role === 'OWNER' ? 'Owner' : 'Member'}
          {preview.jobTitle ? ` · ${preview.jobTitle}` : ''} for {preview.email}.
        </p>
      </div>

      {!loggedIn ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in with {preview.email} to accept this invitation.
          </p>
          <Link
            to={`/login?next=/invitations/${token}`}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      ) : !emailMatch ? (
        <p className="text-sm text-destructive">
          You are signed in as {me.data?.data?.email}. This invite was sent to {preview.email}.
        </p>
      ) : (
        <Button loading={accept.isPending} onClick={onAccept}>
          Join {preview.businessName}
        </Button>
      )}
    </div>
  )
}
