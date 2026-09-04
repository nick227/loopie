// Cross-cutting venture traits (docs/loopie-assistant-playbook-poc/02-feature-analysis.md section
// 5) — let a Playbook target "any high-ticket, quote-based business" without copying itself once
// per industry. A venture leaf in ventures.ts carries whichever of these apply.
export type BusinessTrait =
  | 'LOCAL'
  | 'ONLINE'
  | 'HIGH_TICKET'
  | 'QUOTE_BASED'
  | 'APPOINTMENT_BASED'
  | 'PROJECT_BASED'
  | 'RECURRING_REVENUE'
  | 'SUBSCRIPTION'
  | 'FOOT_TRAFFIC'
  | 'RETAIL'
  | 'AUDIENCE_DRIVEN'
  | 'EVENT_DRIVEN'
