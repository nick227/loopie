import { Plus } from 'lucide-react'
import type { PageContent } from '../../../../pages/landing-pages/components/types'
import { ink } from './tokens'

export type SectionProps<K extends keyof PageContent> = {
  content: PageContent[K]
  editable: boolean
  onChange: (patch: Partial<NonNullable<PageContent[K]>>) => void
}

export function AddRow({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
      style={{ color: ink(60) }}
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
