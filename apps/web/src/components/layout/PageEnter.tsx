import type { ReactNode } from 'react'

/** Soft opacity enter for a freshly committed route — no translate, so layout height stays put. */
export function PageEnter({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>
}
