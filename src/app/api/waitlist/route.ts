import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { waitlistSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const validation = validateBody(waitlistSchema, rawBody)
  if (!validation.success) return validation.response

  const { email: rawEmail, name: rawName, source: rawSource, referral_code } = validation.data
  const email = rawEmail.trim().toLowerCase()
  const name = rawName?.trim() || null
  const referredBy = referral_code?.trim() || null
  // If referred, note it in source; otherwise use provided source or default
  const source = referredBy
    ? `referral:${referredBy}`
    : (rawSource?.trim() || 'landing_page')

  const supabase = createAdminClient()

  // Generate referral code upfront so we can insert in one call
  const tempId = crypto.randomUUID()
  const referralCode = `RIVYLS-${tempId.replace(/-/g, '').substring(0, 8).toUpperCase()}`

  const { error } = await supabase
    .from('waitlist')
    .insert({
      email,
      name,
      source,
      referral_code: referralCode,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, message: "You're already on the list! We'll be in touch soon." },
        { status: 409 }
      )
    }
    console.error('Waitlist insert error:', error)
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "You're on the list! Share your referral link to move up.",
    referral_code: referralCode,
  })
}
