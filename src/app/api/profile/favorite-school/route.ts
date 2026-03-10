import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Set a user's favorite school.
 * Called during signup (before email confirmation, so no session exists).
 * Uses admin client to bypass RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, schoolId } = await request.json()

    if (!userId || !schoolId) {
      return NextResponse.json(
        { error: 'userId and schoolId are required' },
        { status: 400 }
      )
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId) || !uuidRegex.test(schoolId)) {
      return NextResponse.json(
        { error: 'Invalid UUID format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({ favorite_school_id: schoolId })
      .eq('id', userId)

    if (error) {
      console.error('Failed to set favorite school:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Favorite school error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
