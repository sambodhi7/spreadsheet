const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null

export class ApiError extends Error {
  readonly status: number
  readonly payload: Record<string, unknown>

  constructor(
    status: number,
    payload: Record<string, unknown>,
  ) {
    super(typeof payload.detail === 'string' ? payload.detail : `Request failed with status ${status}`)
    this.status = status
    this.payload = payload
  }
}

async function parsePayload(response: Response): Promise<Record<string, unknown>> {
  if (response.status === 204) return {}
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return {}
  return await response.json() as Record<string, unknown>
}

export async function refreshCsrfToken(): Promise<string> {
  if (csrfRequest !== null) return await csrfRequest
  csrfRequest = (async () => {
    const response = await fetch(apiUrl('/auth/csrf/'), {
      cache: 'no-store',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    const payload = await parsePayload(response)
    if (!response.ok || typeof payload.csrfToken !== 'string') {
      throw new ApiError(response.status, payload)
    }
    csrfToken = payload.csrfToken
    return csrfToken
  })()
  try {
    return await csrfRequest
  } finally {
    csrfRequest = null
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (unsafe) {
    headers.set('X-CSRFToken', csrfToken ?? await refreshCsrfToken())
  }

  const send = async () => await fetch(apiUrl(path), {
    ...init, cache: 'no-store', credentials: 'include', headers,
  })
  let response = await send()
  if (unsafe && response.status === 403) {
    headers.set('X-CSRFToken', await refreshCsrfToken())
    response = await send()
  }
  const payload = await parsePayload(response)
  if (!response.ok) throw new ApiError(response.status, payload)
  return payload as T
}
