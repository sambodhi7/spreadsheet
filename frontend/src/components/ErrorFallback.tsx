interface ErrorFallbackProps {
  error: Error
}

export function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <main className="h-full overflow-auto bg-white p-6 text-slate-900" role="alert">
      <h1 className="text-xl font-semibold">The spreadsheet could not render</h1>
      <p className="my-3">Reloading clears all unsaved cells.</p>
      {import.meta.env.DEV && (
        <pre className="whitespace-pre-wrap rounded bg-slate-100 p-4">
          {error.stack || error.message || String(error)}
        </pre>
      )}
      <button
        type="button"
        className="mt-4 rounded border px-4 py-2"
        onClick={() => window.location.reload()}
      >
        Reload spreadsheet
      </button>
    </main>
  )
}
