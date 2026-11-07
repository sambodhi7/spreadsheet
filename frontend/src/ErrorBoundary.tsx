import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="h-full overflow-auto bg-white p-6 text-slate-900">
          <h1 className="text-xl font-semibold">The spreadsheet could not render</h1>
          <p className="my-3">Copy the error below when reporting this issue.</p>
          <pre className="whitespace-pre-wrap rounded bg-slate-100 p-4">
            {this.state.error.stack || this.state.error.message || String(this.state.error)}
          </pre>
          <button className="mt-4 rounded border px-4 py-2" onClick={() => window.location.reload()}>
            Reload spreadsheet
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
