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

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
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
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
