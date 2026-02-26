import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Simple in-memory rate limiting
const rateLimit = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimit.get(ip) || []
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)
  rateLimit.set(ip, recent)
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  return false
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let body: { name?: string; email?: string; source?: string; referral_code?: string; }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { success: false, message: 'Please enter a valid email address.' },
      { status: 400 }
    )
  }

  const name = body.name?.trim() || null
  const referredBy = body.referral_code?.trim() || null
  // If referred, note it in source; otherwise use provided source or default
  const source = referredBy
    ? `referral:${referredBy}`
    : (body.source?.trim() || 'landing_page')

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
