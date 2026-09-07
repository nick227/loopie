import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminListPlatformAffiliates, useAdminCreatePlatformAffiliate } from '@project/sdk'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UniversalRow } from '@/components/ui/UniversalRow'
import { apiErrorMessage } from '@/lib/apiError'

interface PlatformAffiliate {
  id: string
  name: string
  email?: string | null
  referralCode: string
  isActive: boolean
  class?: { name: string } | null
  manager?: { name: string } | null
}

export function AdminPlatformAffiliatesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useAdminListPlatformAffiliates()
  const [form, setForm] = useState({ name: '', email: '' })

  const createAffiliate = useAdminCreatePlatformAffiliate({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platformAffiliates'] })
      setForm({ name: '', email: '' })
      toast.success('Affiliate created')
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Could not create this affiliate')),
  })

  if (isLoading) return <Skeleton className="h-[400px] w-full" />

  const affiliates = (data as { data?: PlatformAffiliate[] } | undefined)?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        variant="list"
        title="Platform Affiliates"
        description="Every user gets one of these automatically at registration. Create one by hand for a partner without a LOOPIE account of their own."
      />

      <Card>
        <CardHeader>
          <CardTitle>Create affiliate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="Email (optional)"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Button
              onClick={() =>
                createAffiliate.mutate({ name: form.name, email: form.email || undefined })
              }
              disabled={!form.name.trim() || createAffiliate.isPending}
            >
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {affiliates.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No platform affiliates yet.
            </div>
          )}
          {affiliates.map((affiliate) => (
            <UniversalRow
              key={affiliate.id}
              title={affiliate.name}
              subtitle={[
                affiliate.email,
                `Code: ${affiliate.referralCode}`,
                affiliate.class?.name ? `Class: ${affiliate.class.name}` : null,
                affiliate.manager?.name ? `Manager: ${affiliate.manager.name}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              trailing={
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    affiliate.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {affiliate.isActive ? 'Active' : 'Inactive'}
                </span>
              }
            />
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Adjust an affiliate&apos;s rate or manager under{' '}
        <span className="font-medium text-foreground">Rates</span>.
      </p>
    </div>
  )
}
