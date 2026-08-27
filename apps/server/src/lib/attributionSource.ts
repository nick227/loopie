import type { SourceType } from '@prisma/client'

// Canonical attribution-source abstraction — the single place that knows how to go from "a row
// with sourceDeploymentId/sourceAdRunId/sourceAdUnitId columns" to "which one is actually set and
// what SourceType does that mean." Built per explicit user direction during the Media/
// Advertisement/AdRun migration: "create one canonical attribution-source abstraction... then
// campaign/dashboard/page reporting all consume the same normalized source set" — centralizing
// this before touching reporting, rather than letting every service independently branch on
// three columns (which is exactly how the Deployment/AdUnit-only version of this codebase had
// already started drifting — see CLAUDE.md's Sale & Reporting Integrity pass).
export const ATTRIBUTION_SOURCE_KINDS = ['AD_RUN', 'DEPLOYMENT', 'AD_UNIT'] as const
export type AttributionSourceKind = (typeof ATTRIBUTION_SOURCE_KINDS)[number]

export type AttributionSource = {
  kind: AttributionSourceKind
  id: string
}

export type AttributionSourceIds = {
  sourceAdRunId?: string | null
  sourceDeploymentId?: string | null
  sourceAdUnitId?: string | null
}

// Precedence when more than one is somehow set (should never happen — application code only
// ever sets one of the three per row — but a single defined order beats an implicit one).
export function resolveAttributionSource(row: AttributionSourceIds): AttributionSource | null {
  if (row.sourceAdRunId) return { kind: 'AD_RUN', id: row.sourceAdRunId }
  if (row.sourceDeploymentId) return { kind: 'DEPLOYMENT', id: row.sourceDeploymentId }
  if (row.sourceAdUnitId) return { kind: 'AD_UNIT', id: row.sourceAdUnitId }
  return null
}

export function sourceTypeForKind(kind: AttributionSourceKind): SourceType {
  return kind
}

// The Prisma column name each kind's id lives in — the one place that mapping is spelled out, so
// every OR-across-three-columns query in reporting is built from this instead of re-typing the
// column names by hand at each call site.
export function columnForKind(
  kind: AttributionSourceKind,
): 'sourceAdRunId' | 'sourceDeploymentId' | 'sourceAdUnitId' {
  switch (kind) {
    case 'AD_RUN':
      return 'sourceAdRunId'
    case 'DEPLOYMENT':
      return 'sourceDeploymentId'
    case 'AD_UNIT':
      return 'sourceAdUnitId'
  }
}

// Builds a Prisma `OR` array matching any Lead/Sale/Interaction whose source falls in the given
// id sets, across all three source dimensions at once — the "union all sources" query every
// reporting rollup needs. Pass only the dimensions relevant to the caller (a Campaign's rollup
// might have deploymentIds + adUnitIds + adRunIds via CampaignAdRun; a standalone Advertisement's
// rollup only has adRunIds).
export function attributionSourceWhereOr(ids: {
  adRunIds?: string[]
  deploymentIds?: string[]
  adUnitIds?: string[]
}): Array<Record<string, { in: string[] }>> {
  const OR: Array<Record<string, { in: string[] }>> = []
  if (ids.adRunIds?.length) OR.push({ sourceAdRunId: { in: ids.adRunIds } })
  if (ids.deploymentIds?.length) OR.push({ sourceDeploymentId: { in: ids.deploymentIds } })
  if (ids.adUnitIds?.length) OR.push({ sourceAdUnitId: { in: ids.adUnitIds } })
  return OR
}
