import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    // Capture cookies so we can set them on the redirect response
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            pendingCookies.push(...cookiesToSet)
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options) } catch { /* Server Component context */ }
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Detect password recovery and redirect to reset-password instead of dashboard
      let redirectTo = next
      const recoverySentAt = data.session?.user?.recovery_sent_at
      if (recoverySentAt) {
        const recoveryAge = Date.now() - new Date(recoverySentAt).getTime()
        if (recoveryAge < 600_000) { // within last 10 minutes
          redirectTo = '/reset-password'
        }
      }

      const response = NextResponse.redirect(`${origin}${redirectTo}`)

      // Set session cookies on the redirect response so the browser receives them
      for (const { name, value, options } of pendingCookies) {
        response.cookies.set(name, value, options as Record<string, string>)
      }

      return response
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not verify email`)
}
