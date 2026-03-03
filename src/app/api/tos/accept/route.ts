import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Log a user's acceptance of the Terms of Service.
 * Called during signup (before email confirmation, so no session exists)
 * and when existing users accept an updated ToS version.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, tosVersion } = await request.json()

    if (!userId || !tosVersion) {
      return NextResponse.json(
        { error: 'userId and tosVersion are required' },
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const supabase = createAdminClient()

    // Verify the user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('tos_agreements')
      .insert({
        user_id: userId,
        tos_version: tosVersion,
        ip_address: ip,
      })

    if (error) {
      console.error('Failed to log ToS agreement:', error)
      return NextResponse.json(
        { error: 'Failed to log agreement' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ToS accept error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
