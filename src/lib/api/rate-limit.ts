import { NextResponse } from 'next/server'

/**
 * In-memory sliding-window rate limiter.
 *
 * Each call to `createRateLimiter()` returns an independent limiter with its
 * own request store, window size, and max request count. Attach the returned
 * `check` function at the top of a route handler.
 *
 * NOTE: This is per-process / in-memory. It resets on redeploy and does not
 * share state across Vercel serverless instances. For a small app this is
 * fine — it stops casual abuse without adding infrastructure.
 */

interface RateLimiterOptions {
  /** Sliding window duration in milliseconds (default: 60 000 = 1 min) */
  windowMs?: number
  /** Maximum requests allowed within the window (default: 5) */
  max?: number
}

interface RateLimitResult {
  limited: boolean
  response?: NextResponse
}

export function createRateLimiter(opts: RateLimiterOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000
  const max = opts.max ?? 5
  const store = new Map<string, number[]>()

  return {
    /**
     * Check whether the given IP has exceeded the rate limit.
     * Returns `{ limited: false }` if OK, or `{ limited: true, response }` with
     * a 429 NextResponse if the caller should stop processing.
     */
    check(ip: string): RateLimitResult {
      const now = Date.now()
      const timestamps = store.get(ip) || []
      const recent = timestamps.filter(t => now - t < windowMs)
      store.set(ip, recent)

      if (recent.length >= max) {
        return {
          limited: true,
          response: NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            { status: 429 }
          ),
        }
      }

      recent.push(now)
      return { limited: false }
    },
  }
}

/**
 * Extract the client IP from a request's x-forwarded-for header.
 * Falls back to 'unknown' when the header is missing.
 */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
