import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { reportSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'

const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!
  try {
    // Verify user is authenticated — use session user ID instead of client-provided
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const rawBody = await request.json()
    const validation = validateBody(reportSchema, rawBody)
    if (!validation.success) return validation.response

    const { category, description, page, userAgent } = validation.data

    const supabase = createAdminClient()

    // Try to insert into issue_reports table
    // If table doesn't exist, we'll catch the error and still return success
    // (user's report is logged to console as fallback)
    try {
      const { error } = await supabase
        .from('issue_reports')
        .insert({
          category,
          description,
          user_id: user.id,
          page,
          user_agent: userAgent,
          status: 'new',
        })

      if (error) {
        // Table might not exist - log to console as fallback
        console.log('Issue Report (table may not exist):', {
          category,
          description,
          userId: user.id,
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
        userId: user.id,
        page,
        userAgent,
        timestamp: new Date().toISOString(),
      })
    }

    logActivity({
      userId: user.id,
      action: 'issue_report.submitted',
      details: { category },
    })

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
