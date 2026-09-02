import type { ContactTagColor } from '@project/sdk'

// Mirrors apps/server/src/lib/contactTags.ts's TAG_COLOR_PALETTE exactly — a small fixed set, not
// a raw hex value, so a tag chip is themeable and dark-mode-aware for free. Deliberately manual
// pairing (same discipline every other enum-shaped string keeps on both sides of the API
// boundary), not derived from the SDK types.
export const TAG_COLOR_CLASSES: Record<ContactTagColor, string> = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30',
  slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
}

export const TAG_COLOR_DOT: Record<ContactTagColor, string> = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
  slate: 'bg-slate-500',
}
