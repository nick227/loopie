import { createContext, useContext, useEffect } from 'react'

// The persistent header (components/layout/Shell.tsx) needs to show an entity's real name
// ("Summer Campaign", "Jane Smith") in its center context slot, but Shell renders above <Outlet/>
// and has no way to know that name itself — only the entity page does, once its own data loads.
// This is the one-way channel: a page calls usePageTitle(name) to report it upward; Shell owns the
// actual state and resets it to null on every route change so a stale title never survives a
// navigation before the new page's own effect fires.
export const SetHeaderTitleContext = createContext<(title: string | null) => void>(() => {})

export function usePageTitle(title: string | null) {
  const setTitle = useContext(SetHeaderTitleContext)
  useEffect(() => {
    setTitle(title)
    return () => setTitle(null)
  }, [title, setTitle])
}
