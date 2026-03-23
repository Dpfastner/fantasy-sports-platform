import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Process email unsubscribe via tokenized link (CAN-SPAM compliance).
 * Blocked until DNS transfer enables Resend email sending (Apr 21, 2026).
 * The token format will be: base64(userId:timestamp:hmac)
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // TODO: Implement token validation once email sending is live
    // For now, decode the token to get the userId and update preferences
    let userId: string
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const parts = decoded.split(':')
      if (parts.length < 1) throw new Error('Invalid token format')
      userId = parts[0]
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Set all promotional email preferences to false
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        email_game_results: false,
        email_draft_reminders: false,
        email_transaction_confirmations: false,
        email_league_announcements: false,
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Unsubscribe error:', error)
      return NextResponse.json({ error: "Couldn't update preferences. Try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
