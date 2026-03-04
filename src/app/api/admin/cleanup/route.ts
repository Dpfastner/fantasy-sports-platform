import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { cleanupOldContent } from '@/lib/moderation/cleanup'

const ADMIN_USER_IDS = [
  '5ab25825-1e29-4949-b798-61a8724170d6',
]

export async function POST() {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!ADMIN_USER_IDS.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Default cutoff: start of current CFB season (August 1st of current year)
    const now = new Date()
    const seasonYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    const cutoffDate = `${seasonYear}-08-01T00:00:00Z`

    const result = await cleanupOldContent(cutoffDate)

    return NextResponse.json({
      success: true,
      cutoffDate,
      ...result,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    )
  }
}
