import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchRankings } from '@/lib/api/espn'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

interface BackfillRequest {
  year: number
  weeks?: number[] // Specific weeks to sync, or all 0-15 if not provided
}

export async function POST(request: Request) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BackfillRequest = await request.json().catch(() => ({ year: 2025 }))
    const year = body.year || 2025
    const weeksToSync = body.weeks || Array.from({ length: 16 }, (_, i) => i) // Weeks 0-15

    const supabase = getSupabaseAdmin()

    // Get season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json({ error: `Season ${year} not found` }, { status: 404 })
    }

    // Get school mappings
    const { data: schools } = await supabase
      .from('schools')
      .select('id, external_api_id, name')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    const schoolNameMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
        schoolNameMap.set(school.id, school.name)
      }
    }

    // ESPN API returns current rankings, not historical
    // We'll sync what's available and assign to the highest week number
    const rankingsData = await fetchRankings(year)
    const apPoll = rankingsData.rankings?.find(
      r => r.name.toLowerCase().includes('ap') || r.type === 'ap'
    )

    if (!apPoll || !apPoll.ranks) {
      return NextResponse.json({
        error: 'AP Top 25 poll not found in ESPN data',
        note: 'ESPN only provides current week rankings, not historical data'
      }, { status: 404 })
    }

    const results: Array<{ week: number; synced: number; skipped: number }> = []

    // For each week, insert the current rankings
    // Note: ESPN doesn't provide historical data, so all weeks will have the same rankings
    // In a real scenario, you'd need to run this cron weekly to capture each week's rankings
    for (const week of weeksToSync) {
      // Get previous week's rankings for movement
      const { data: prevRankings } = await supabase
        .from('ap_rankings_history')
        .select('school_id, rank')
        .eq('season_id', season.id)
        .eq('week_number', week - 1)

      const prevRankMap = new Map<string, number>()
      for (const pr of prevRankings || []) {
        prevRankMap.set(pr.school_id, pr.rank)
      }

      // Clear existing for this week
      await supabase
        .from('ap_rankings_history')
        .delete()
        .eq('season_id', season.id)
        .eq('week_number', week)

      let synced = 0
      let skipped = 0

      for (const rankedTeam of apPoll.ranks) {
        const espnId = rankedTeam.team?.id
        const schoolId = espnId ? schoolMap.get(espnId) : null

        if (!schoolId) {
          skipped++
          continue
        }

        const previousRank = prevRankMap.get(schoolId) || null

        const { error } = await supabase
          .from('ap_rankings_history')
          .insert({
            season_id: season.id,
            week_number: week,
            school_id: schoolId,
            rank: rankedTeam.current,
            previous_rank: previousRank,
          })

        if (!error) {
          synced++
        }
      }

      results.push({ week, synced, skipped })
    }

    return NextResponse.json({
      success: true,
      year,
      pollName: apPoll.name,
      totalRanked: apPoll.ranks.length,
      results,
      note: 'ESPN only provides current rankings. To get accurate historical data, the rankings-sync cron should run every Tuesday during the season.',
    })
  } catch (error) {
    console.error('Rankings backfill error:', error)
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Rankings backfill endpoint',
    usage: 'POST with { year: 2025, weeks: [0,1,2,...] } and Authorization: Bearer <SYNC_API_KEY>',
    note: 'ESPN only provides current week rankings. This will populate all specified weeks with current data.',
    example: { year: 2025, weeks: [0, 1, 2, 3, 4, 5] },
  })
}
