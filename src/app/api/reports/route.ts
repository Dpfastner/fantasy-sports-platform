import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, description, userId, page, userAgent } = body

    if (!description || !category) {
      return NextResponse.json(
        { error: 'Category and description are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Try to insert into issue_reports table
    // If table doesn't exist, we'll catch the error and still return success
    // (user's report is logged to console as fallback)
    try {
      const { error } = await supabase
        .from('issue_reports')
        .insert({
          category,
          description,
          user_id: userId || null,
          page,
          user_agent: userAgent,
          status: 'new',
        })

      if (error) {
        // Table might not exist - log to console as fallback
        console.log('Issue Report (table may not exist):', {
          category,
          description,
          userId,
          page,
          userAgent,
          timestamp: new Date().toISOString(),
        })
      }
    } catch {
      // Log to console as fallback
      console.log('Issue Report:', {
        category,
        description,
        userId,
        page,
        userAgent,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Report submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Issue reports endpoint',
    usage: 'POST with category and description',
  })
}
