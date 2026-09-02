import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  Database,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import {
  useBilling,
  useCurrentUser,
  useDisconnectIntegration,
  useDisconnectPlatformConnection,
  useIntegrations,
  useLogout,
  usePlatformConnection,
} from '@project/sdk'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { subscriptionStatusLabel, toBillingSnapshot } from '@/lib/billingCopy'

const PLATFORMS = [
  { id: 'META', label: 'Meta' },
  { id: 'GOOGLE', label: 'Google' },
  { id: 'TIKTOK', label: 'TikTok' },
] as const

type Permission = {
  id: string
  label: string
  kind: 'platform' | 'integration'
  detail: string
  access: string[]
}

function roleLabel(role: string | undefined) {
  if (role === 'ADMIN') return 'Account owner'
  if (role === 'AFFILIATE') return 'Affiliate'
  return 'Team member'
}

function BillingSummary() {
  const billing = useBilling()
  const data = toBillingSnapshot(billing.data?.data)

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          <CreditCard size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Billing
          </p>
          {billing.isLoading ? (
            <Skeleton className="mt-3 h-10 w-full" />
          ) : billing.isError ? (
            <p className="mt-2 text-sm text-destructive">Billing status could not be loaded.</p>
          ) : (
            <>
              <p className="mt-2 font-medium text-foreground">
                {data?.planName ?? 'LOOPIE'}
                {data?.planPriceLabel ? ` · ${data.planPriceLabel}` : ''}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {subscriptionStatusLabel(data?.subscriptionStatus)}
              </p>
            </>
          )}
        </div>
      </div>
      <Link
        to="/billing"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Manage billing <ArrowUpRight size={14} />
      </Link>
    </section>
  )
}

function PermissionsLedger() {
  const integrations = useIntegrations()
  const meta = usePlatformConnection('META')
  const google = usePlatformConnection('GOOGLE')
  const tiktok = usePlatformConnection('TIKTOK')
  const disconnectIntegration = useDisconnectIntegration()
  const disconnectPlatform = useDisconnectPlatformConnection()
  const [removing, setRemoving] = useState<Permission | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const platformQueries = [meta, google, tiktok]
  const permissions = useMemo<Permission[]>(() => {
    const platformConnections = [meta.data?.data, google.data?.data, tiktok.data?.data]
    const platformPermissions = PLATFORMS.flatMap((platform, index) => {
      const connection = platformConnections[index]
      if (!connection || connection.status === 'DISCONNECTED') return []
      const access = ['Publish and manage advertisements']
      if (connection.capabilities.pullSpend) access.push('Read advertising spend')
      if (connection.capabilities.mappingFields.includes('page'))
        access.push('Access selected pages')
      return [
        {
          id: platform.id,
          label: platform.label,
          kind: 'platform' as const,
          detail: connection.adAccountId
            ? `Ad account ${connection.adAccountId}`
            : 'Advertising account',
          access,
        },
      ]
    })

    const integrationPermissions = (integrations.data?.pages ?? []).flatMap((page) =>
      page.data
        .filter((row) => row.status !== 'PAUSED')
        .map((row) => ({
          id: row.id,
          label: row.label ?? row.provider,
          kind: 'integration' as const,
          detail: 'Customer data connection',
          access: [
            row.capabilities?.contacts ? 'Read contacts' : null,
            row.capabilities?.companies ? 'Read companies' : null,
            row.capabilities?.deals ? 'Read deals' : null,
            row.capabilities?.orders ? 'Read orders' : null,
            row.capabilities?.payments ? 'Read payments' : null,
            row.capabilities?.events ? 'Read customer events' : null,
          ].filter((value): value is string => Boolean(value)),
        })),
    )
    return [...platformPermissions, ...integrationPermissions]
  }, [integrations.data, meta.data, google.data, tiktok.data])

  const loading = integrations.isLoading || platformQueries.some((query) => query.isLoading)
  const loadError = integrations.isError || platformQueries.some((query) => query.isError)

  async function confirmRemoval() {
    if (!removing) return
    setActionError(null)
    try {
      if (removing.kind === 'platform') await disconnectPlatform.mutateAsync(removing.id)
      else await disconnectIntegration.mutateAsync(removing.id)
      setRemoving(null)
    } catch {
      setActionError(`Access for ${removing.label} could not be removed. Try again.`)
    }
  }

  return (
    <section
      aria-labelledby="permissions-heading"
      className="overflow-hidden rounded-2xl border border-border bg-surface/40"
    >
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <h2
            id="permissions-heading"
            className="mt-2 text-xl font-semibold tracking-tight text-foreground"
          >
            Permissions
          </h2>
        </div>
        {!loading && !loadError ? (
          <p className="text-sm tabular-nums text-muted-foreground">
            {permissions.length} active {permissions.length === 1 ? 'connection' : 'connections'}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : loadError ? (
        <div className="p-5 sm:p-6">
          <p className="text-sm text-destructive">
            Some permission information could not be loaded.
          </p>
        </div>
      ) : permissions.length === 0 ? (
        <div className="flex items-start gap-3 p-5 sm:p-6">
          <ShieldCheck className="mt-0.5 text-muted-foreground" size={20} />
          <div>
            <p className="font-medium text-foreground">No third-party access</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Loopie is not holding permission to any connected account.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {permissions.map((permission) => (
            <div
              key={`${permission.kind}-${permission.id}`}
              className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  {permission.kind === 'platform' ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <Database size={16} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{permission.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{permission.detail}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {permission.access.join(' · ') || 'Basic account access'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionError(null)
                  setRemoving(permission)
                }}
              >
                Remove access
              </Button>
            </div>
          ))}
        </div>
      )}

      {removing ? (
        <Modal
          title={`Remove ${removing.label}?`}
          onClose={() => {
            if (!disconnectIntegration.isPending && !disconnectPlatform.isPending) setRemoving(null)
          }}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Keep access
              </Button>
              <Button
                variant="destructive"
                loading={disconnectIntegration.isPending || disconnectPlatform.isPending}
                onClick={confirmRemoval}
              >
                Remove access
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Loopie will delete its stored authorization for {removing.label}. Existing reports and
            imported records stay in your account.
          </p>
          {actionError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {actionError}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </section>
  )
}

export function ProfilePage() {
  const me = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = me.data?.data
  const isAffiliate = user?.role === 'AFFILIATE'

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/login', { replace: true })
  }

  if (!user) return <Skeleton className="h-72 w-full" />

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="p-2">
        <div aria-hidden="true" className="absolute right-0 top-0 h-full w-1 bg-foreground" />
        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar
              name={user.email}
              size="lg"
              className="h-16 w-16 border border-border bg-background text-lg"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {user.email}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {roleLabel(user.role)} · Member since{' '}
                {new Date(user.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck size={16} />
            <span>Visible only to you</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">{!isAffiliate ? <PermissionsLedger /> : null}</div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <Building2 size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Account
                </p>
                <p className="mt-2 truncate font-medium text-foreground">
                  {user.businessName || 'Loopie account'}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-5 w-full"
              loading={logout.isPending}
              onClick={handleLogout}
            >
              <LogOut size={15} />
              Sign out
            </Button>
          </section>
          {user.role === 'ADMIN' ? <BillingSummary /> : null}
        </aside>
      </div>
    </div>
  )
}
