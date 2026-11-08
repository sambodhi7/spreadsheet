import { Component, type ReactNode } from 'react'
import { ErrorFallback } from './components/ErrorFallback'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(value: unknown): ErrorBoundaryState {
    return { error: value instanceof Error ? value : new Error(String(value)) }
  }

  render() {
    return this.state.error
      ? <ErrorFallback error={this.state.error} />
      : this.props.children
  }
}
