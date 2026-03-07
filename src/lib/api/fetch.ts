/**
 * fetchWithRetry — drop-in replacement for fetch() with automatic retry.
 *
 * - GET requests: retry on network errors AND 5xx responses (up to 3 attempts)
 * - Mutations (POST/PATCH/DELETE): retry ONLY on network errors (not HTTP errors)
 * - 4xx responses are never retried (client error / validation)
 * - Exponential backoff: 1s, 2s, 4s (configurable)
 */

interface FetchWithRetryOptions extends RequestInit {
  /** Max total attempts (including the first). Default: 3 for GET, 2 for mutations */
  maxAttempts?: number
  /** Base delay in ms before first retry. Doubles each attempt. Default: 1000 */
  baseDelay?: number
  /** If true, skip retry entirely. Default: false */
  noRetry?: boolean
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error && error.message.includes('fetch'))
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxAttempts: userMaxAttempts,
    baseDelay = 1000,
    noRetry = false,
    ...fetchOptions
  } = options

  const method = (fetchOptions.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  const maxAttempts = noRetry ? 1 : (userMaxAttempts ?? (isGet ? 3 : 2))

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)

      // Never retry on 4xx (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // For GET: retry on 5xx server errors
      if (response.status >= 500 && isGet && attempt < maxAttempts) {
        await delay(baseDelay * Math.pow(2, attempt - 1))
        continue
      }

      return response
    } catch (error) {
      lastError = error
      if (isNetworkError(error) && attempt < maxAttempts) {
        await delay(baseDelay * Math.pow(2, attempt - 1))
        continue
      }
      throw error
    }
  }

  throw lastError
}
