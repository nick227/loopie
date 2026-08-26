import { db } from '@project/db'

export class DashboardService {
  // Operational, "what needs me today" — the training pack's Start of Day checklist
  // (docs/02-daily-account-operations.md), made into the landing screen per
  // docs/00-unified-ia-navigation.md.
  async home(businessId: string) {
    const [newLeads, followUpsDue, failedSends, unansweredReplies, automationErrors] =
      await Promise.all([
        db.lead.count({ where: { businessId, stage: 'NEW' } }),
        // Real due-today count now that AutomationExecutorService's poller exists — pending runs
        // whose runAt has arrived, not just a count of active rules (see the "FIXED" note this
        // replaced in CLAUDE.md).
        db.automationRun.count({
          where: { status: 'PENDING', runAt: { lte: new Date() }, automation: { businessId } },
        }),
        db.message.count({ where: { businessId, status: 'FAILED' } }),
        // "Unanswered" approximates as replies in the last 7 days — a precise definition needs
        // to check for a later outbound interaction on the same contact, not yet computed here.
        db.interaction.count({
          where: {
            businessId,
            type: 'REPLY',
            occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        db.automationLog.count({
          where: {
            outcome: 'FAILED',
            automation: { businessId },
            triggeredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ])
    return {
      newLeads,
      unansweredReplies,
      followUpsDue,
      failedSends,
      automationErrors,
    }
  }

  // Retrospective, blended funnel across Advertising spend and organic Messages —
  // docs/00-unified-ia-navigation.md "Home vs. Results".
  async results(businessId: string) {
    const [deployments, adUnits, leads, sales, revenueAgg] = await Promise.all([
      db.deployment.findMany({
        where: { campaign: { businessId } },
        select: { spend: true, impressions: true, clicks: true },
      }),
      db.adUnit.findMany({ where: { businessId }, select: { impressions: true, clicks: true } }),
      db.lead.count({ where: { businessId } }),
      db.sale.count({ where: { businessId } }),
      db.sale.aggregate({ where: { businessId }, _sum: { amount: true } }),
    ])

    const totalSpend = deployments.reduce((sum, d) => sum + Number(d.spend), 0)
    const totalRevenue = Number(revenueAgg._sum.amount ?? 0)
    const blendedCpl = leads > 0 ? totalSpend / leads : null
    const totalViews =
      deployments.reduce((s, d) => s + d.impressions, 0) +
      adUnits.reduce((s, a) => s + a.impressions, 0)
    const totalClicks =
      deployments.reduce((s, d) => s + d.clicks, 0) + adUnits.reduce((s, a) => s + a.clicks, 0)

    const [
      leadsByMessage,
      salesByMessage,
      revenueByMessage,
      leadsByDeployment,
      salesByDeployment,
      revenueByDeployment,
      leadsByAdUnit,
      salesByAdUnit,
      revenueByAdUnit,
    ] = await Promise.all([
      db.lead.groupBy({
        by: ['sourceMessageId'],
        where: { businessId, sourceType: 'MESSAGE' },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceMessageId'],
        where: { businessId, sourceType: 'MESSAGE' },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceMessageId'],
        where: { businessId, sourceType: 'MESSAGE' },
        _sum: { amount: true },
      }),
      db.lead.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceType: 'DEPLOYMENT' },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceType: 'DEPLOYMENT' },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceDeploymentId'],
        where: { businessId, sourceType: 'DEPLOYMENT' },
        _sum: { amount: true },
      }),
      db.lead.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceType: 'AD_UNIT' },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceType: 'AD_UNIT' },
        _count: { _all: true },
      }),
      db.sale.groupBy({
        by: ['sourceAdUnitId'],
        where: { businessId, sourceType: 'AD_UNIT' },
        _sum: { amount: true },
      }),
    ])

    const messageIds = [
      ...new Set(leadsByMessage.map((r) => r.sourceMessageId).filter((v): v is string => !!v)),
    ]
    const messages = await db.message.findMany({
      where: { id: { in: messageIds } },
      select: { id: true, subject: true, channel: true },
    })
    const messageLabel = new Map(messages.map((m) => [m.id, m.subject ?? `${m.channel} message`]))

    const deploymentIds = [
      ...new Set(
        leadsByDeployment.map((r) => r.sourceDeploymentId).filter((v): v is string => !!v),
      ),
    ]
    const deploymentRows = await db.deployment.findMany({
      where: { id: { in: deploymentIds } },
      include: { campaign: { select: { name: true } } },
    })
    const deploymentLabel = new Map(
      deploymentRows.map((d) => [d.id, `${d.campaign.name} · ${d.platform}`]),
    )
    const deploymentSpend = new Map(deploymentRows.map((d) => [d.id, Number(d.spend)]))

    const adUnitIds = [
      ...new Set(leadsByAdUnit.map((r) => r.sourceAdUnitId).filter((v): v is string => !!v)),
    ]
    const adUnitRows = await db.adUnit.findMany({
      where: { id: { in: adUnitIds } },
      include: { campaign: { select: { name: true } } },
    })
    const adUnitLabel = new Map(adUnitRows.map((a) => [a.id, `${a.campaign.name} · LOOPIE`]))

    const bySource: {
      sourceType: 'MESSAGE' | 'DEPLOYMENT' | 'AD_UNIT'
      sourceId: string
      label: string
      leads: number
      sales: number
      revenue: number
      spend: number | null
    }[] = []

    for (const row of leadsByMessage) {
      if (!row.sourceMessageId) continue
      const salesCount =
        salesByMessage.find((s) => s.sourceMessageId === row.sourceMessageId)?._count._all ?? 0
      const revenue = Number(
        revenueByMessage.find((s) => s.sourceMessageId === row.sourceMessageId)?._sum.amount ?? 0,
      )
      bySource.push({
        sourceType: 'MESSAGE',
        sourceId: row.sourceMessageId,
        label: messageLabel.get(row.sourceMessageId) ?? 'Message',
        leads: row._count._all,
        sales: salesCount,
        revenue,
        spend: null,
      })
    }
    for (const row of leadsByDeployment) {
      if (!row.sourceDeploymentId) continue
      const salesCount =
        salesByDeployment.find((s) => s.sourceDeploymentId === row.sourceDeploymentId)?._count
          ._all ?? 0
      const revenue = Number(
        revenueByDeployment.find((s) => s.sourceDeploymentId === row.sourceDeploymentId)?._sum
          .amount ?? 0,
      )
      bySource.push({
        sourceType: 'DEPLOYMENT',
        sourceId: row.sourceDeploymentId,
        label: deploymentLabel.get(row.sourceDeploymentId) ?? 'Campaign deployment',
        leads: row._count._all,
        sales: salesCount,
        revenue,
        spend: deploymentSpend.get(row.sourceDeploymentId) ?? null,
      })
    }
    for (const row of leadsByAdUnit) {
      if (!row.sourceAdUnitId) continue
      const salesCount =
        salesByAdUnit.find((s) => s.sourceAdUnitId === row.sourceAdUnitId)?._count._all ?? 0
      const revenue = Number(
        revenueByAdUnit.find((s) => s.sourceAdUnitId === row.sourceAdUnitId)?._sum.amount ?? 0,
      )
      bySource.push({
        sourceType: 'AD_UNIT',
        sourceId: row.sourceAdUnitId,
        label: adUnitLabel.get(row.sourceAdUnitId) ?? 'First-party ad unit',
        leads: row._count._all,
        sales: salesCount,
        revenue,
        spend: null, // first-party inventory has no external spend concept — see AdUnit in schema.prisma
      })
    }
    bySource.sort((a, b) => b.leads - a.leads)

    return {
      totalSpend,
      totalLeads: leads,
      totalSales: sales,
      totalRevenue,
      blendedCpl,
      funnel: {
        views: totalViews,
        clicks: totalClicks,
        leads,
        sales,
      },
      bySource: bySource.slice(0, 10),
    }
  }
}
