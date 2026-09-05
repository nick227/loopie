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
  // Powered-equipment/vehicle trades with a real maintenance story (mowers, roofing gear, HVAC
  // tools) — distinct from a LOCAL trade that only needs hand tools (painting, handyman) or none
  // at all (photography). Lets one playbook show an equipment-maintenance step only where it's
  // genuinely relevant instead of to every LOCAL business.
  | 'EQUIPMENT_HEAVY'
