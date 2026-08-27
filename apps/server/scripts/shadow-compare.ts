// Real-data runner around lib/shadowComparison.ts#compareSourcePair — see CLAUDE.md's Media/
// Advertisement/AdRun migration audit. Deliberately thin: this file contains no attribution or
// reporting logic of its own, only argument parsing and output formatting. Per explicit user
// direction, it does not persist run history — add that later only if longitudinal comparison
// (tracking the same pair's result over multiple runs) turns out to be needed; a single run's
// `runAt` timestamp in the JSON output is enough for now.
//
// Usage:
//   pnpm --filter server shadow-compare -- --business <id> --deployment <id> --ad-run <id>
//   pnpm --filter server shadow-compare -- --business <id> --ad-unit <id> --ad-run <id>
//   pnpm --filter server shadow-compare -- --batch path/to/pairs.json
//   ... append --json to either form for machine-readable output.
//
// Batch file: a JSON array of
//   { "label"?: string, "businessId": string, "legacyKind": "DEPLOYMENT" | "AD_UNIT", "legacyId": string, "adRunId": string }
import { readFileSync } from 'fs'
import { compareSourcePair, type ShadowComparisonReport } from '../src/lib/shadowComparison'

type Pair = {
  label?: string
  businessId: string
  legacyKind: 'DEPLOYMENT' | 'AD_UNIT'
  legacyId: string
  adRunId: string
}

type RunResult =
  | ({ label: string; runAt: string; ok: true } & ShadowComparisonReport)
  | { label: string; runAt: string; ok: false; error: string; readyForCutover: false }

function usage(): never {
  console.error(
    [
      'Usage:',
      '  pnpm --filter server shadow-compare -- --business <id> --deployment <id> --ad-run <id> [--json]',
      '  pnpm --filter server shadow-compare -- --business <id> --ad-unit <id> --ad-run <id> [--json]',
      '  pnpm --filter server shadow-compare -- --batch path/to/pairs.json [--json]',
      '',
      'Batch file: a JSON array of { "label"?, "businessId", "legacyKind": "DEPLOYMENT"|"AD_UNIT", "legacyId", "adRunId" }',
    ].join('\n'),
  )
  process.exit(1)
}

function parseArgs(): { pairs: Pair[]; json: boolean } {
  const raw = process.argv.slice(2)
  const flags: Record<string, string> = {}
  let json = false
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '--json') {
      json = true
      continue
    }
    if (raw[i]?.startsWith('--')) flags[raw[i].slice(2)] = raw[++i]
  }

  if (flags.batch) {
    const pairs = JSON.parse(readFileSync(flags.batch, 'utf-8')) as Pair[]
    if (!Array.isArray(pairs) || !pairs.length) usage()
    return { pairs, json }
  }

  if (
    !flags.business ||
    !flags['ad-run'] ||
    (!flags.deployment && !flags['ad-unit']) ||
    (flags.deployment && flags['ad-unit'])
  ) {
    usage()
  }
  const legacyKind: 'DEPLOYMENT' | 'AD_UNIT' = flags.deployment ? 'DEPLOYMENT' : 'AD_UNIT'
  const legacyId = (flags.deployment ?? flags['ad-unit'])!
  return {
    json,
    pairs: [{ businessId: flags.business, legacyKind, legacyId, adRunId: flags['ad-run'] }],
  }
}

async function runOne(pair: Pair): Promise<RunResult> {
  const label = pair.label ?? `${pair.legacyKind}:${pair.legacyId} vs AD_RUN:${pair.adRunId}`
  const runAt = new Date().toISOString()
  try {
    const report = await compareSourcePair(
      pair.businessId,
      { kind: pair.legacyKind, id: pair.legacyId },
      pair.adRunId,
    )
    return { label, runAt, ok: true, ...report }
  } catch (err: any) {
    return { label, runAt, ok: false, error: err?.message ?? String(err), readyForCutover: false }
  }
}

function statusMarker(status: string) {
  if (status === 'match') return '✓'
  if (status === 'expected_model_difference') return '·'
  return '✗' // migration_defect | legacy_data_ambiguity | connector_timing_difference
}

function printHuman(result: RunResult) {
  console.log(`\n=== ${result.label} ===`)
  console.log(`  run at: ${result.runAt}`)
  if (!result.ok) {
    console.log(`  ✗ ERROR — ${result.error}`)
    return
  }
  console.log(`  legacy: ${result.legacySource.kind} ${result.legacySource.id}`)
  console.log(`  new:    AD_RUN ${result.newSource.id}`)
  for (const f of result.findings) {
    console.log(`  ${statusMarker(f.status)} ${f.dimension} [${f.status}] — ${f.detail}`)
  }
  console.log(
    result.readyForCutover
      ? '  → READY FOR CUTOVER'
      : '  → NOT READY — unexplained structural mismatch(es) above',
  )
}

async function main() {
  const { pairs, json } = parseArgs()
  const results: RunResult[] = []
  for (const pair of pairs) results.push(await runOne(pair))

  if (json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    for (const r of results) printHuman(r)
    const readyCount = results.filter((r) => r.readyForCutover).length
    console.log(
      `\n${results.length} pair(s) compared — ${readyCount}/${results.length} ready for cutover.`,
    )
  }

  process.exitCode = results.every((r) => r.readyForCutover) ? 0 : 1
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => process.exit(process.exitCode ?? 0))
