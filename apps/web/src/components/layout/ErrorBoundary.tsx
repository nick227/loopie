import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

// Every route is a React.lazy() chunk (see App.tsx). After a deploy, a tab left open from the
// previous build references chunk filenames that no longer exist on the server (Vite hashes
// them per build) — navigating to a route not yet visited in that tab throws a failed-dynamic-
// import error here instead of reaching the page at all. Browsers phrase this differently:
// Chrome/Edge "Failed to fetch dynamically imported module", Firefox "error loading dynamically
// imported module", Safari just "Importing a module script failed." (confirmed live: this is
// exactly what an iPhone Safari session hit on /calendar right after a production redeploy).
const STALE_CHUNK_ERROR =
  /dynamically imported module|importing a module script failed|loading chunk/i

const CHUNK_RELOAD_GUARD = 'loopie:chunk-reload-attempted'

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    if (STALE_CHUNK_ERROR.test(error.message)) {
      // One-shot: if reloading doesn't clear it (a real, persistent failure rather than a stale
      // build), fall through to the normal fallback UI instead of loop-reloading forever.
      let alreadyTried = false
      try {
        alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_GUARD) === '1'
        if (!alreadyTried) sessionStorage.setItem(CHUNK_RELOAD_GUARD, '1')
      } catch {
        // Storage unavailable (private mode, etc.) — fall back to the normal fallback UI.
        alreadyTried = true
      }
      if (!alreadyTried) window.location.reload()
    }
  }

  public componentDidMount() {
    // A clean mount means this screen loaded fine — clear the guard so a genuinely new stale
    // chunk after the *next* deploy is still allowed one automatic retry.
    if (!this.state.hasError) {
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_GUARD)
      } catch {
        // ignore
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex w-full items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 flex flex-col items-center gap-2 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
              <p className="text-sm">
                This screen could not be displayed. Navigate to another page or reload to try again.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
