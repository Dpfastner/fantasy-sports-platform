import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getOrCreateCustomer, createCheckoutSession } from '@/lib/stripe'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ max: 5, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(req)
    const { limited, response } = limiter.check(ip)
    if (limited) return response!

    // Auth check
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const { amount } = await req.json()
    const amountCents = Math.round(Number(amount) * 100)
    if (!amountCents || amountCents < 100 || amountCents > 100000) {
      return NextResponse.json(
        { error: 'Amount must be between $1 and $1,000' },
        { status: 400 }
      )
    }

    // Admin client for profile updates
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(admin, user.id, user.email!)

    const origin = req.headers.get('origin') || 'https://rivyls.com'

    // Create checkout session
    const url = await createCheckoutSession({
      customerId,
      amountCents,
      successUrl: `${origin}/support?success=true`,
      cancelUrl: `${origin}/support?canceled=true`,
      userId: user.id,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[stripe/checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
