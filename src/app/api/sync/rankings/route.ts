import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchRankings } from '@/lib/api/espn'

// Create admin client lazily at runtime (not build time)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(url, key)
}

interface SyncRankingsRequest {
  year?: number
  week?: number
}

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SyncRankingsRequest = await request.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()
    const week = body.week || 1

    console.log(`Fetching rankings for ${year}...`)

    // Fetch rankings from ESPN
    const rankingsData = await fetchRankings(year)

    // Find the AP Top 25 poll
    const apPoll = rankingsData.rankings?.find(
      r => r.name.toLowerCase().includes('ap') || r.type === 'ap'
    )

    if (!apPoll) {
      return NextResponse.json(
        { error: 'AP Top 25 poll not found in ESPN data' },
        { status: 404 }
      )
    }

    console.log(`Found AP poll with ${apPoll.ranks?.length || 0} ranked teams`)

    // Get season ID from our database
    const { data: season } = await getSupabaseAdmin()
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: `Season ${year} not found in database` },
        { status: 404 }
      )
    }

    // Get school mappings (ESPN ID -> our school ID)
    const { data: schools } = await getSupabaseAdmin()
      .from('schools')
      .select('id, external_api_id, name')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    const schoolNameMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
      }
      schoolNameMap.set(school.id, school.name)
    }

    const syncedRankings: Array<{
      rank: number
      schoolName: string
      espnId: string
    }> = []
    const skippedTeams: string[] = []

    // Clear existing rankings for this week first
    await getSupabaseAdmin()
      .from('ap_rankings_history')
      .delete()
      .eq('season_id', season.id)
      .eq('week_number', week)

    // Insert new rankings
    for (const rankedTeam of apPoll.ranks || []) {
      const espnId = rankedTeam.team?.id
      const schoolId = espnId ? schoolMap.get(espnId) : null

      if (!schoolId) {
        skippedTeams.push(
          `#${rankedTeam.current} ${rankedTeam.team?.displayName || 'Unknown'} (ESPN ID: ${espnId || 'none'})`
        )
        continue
      }

      const { error: insertError } = await getSupabaseAdmin()
        .from('ap_rankings_history')
        .insert({
          season_id: season.id,
          week_number: week,
          school_id: schoolId,
          rank: rankedTeam.current,
        })

      if (insertError) {
        console.error(`Error inserting ranking for team ${espnId}:`, insertError)
        skippedTeams.push(
          `#${rankedTeam.current} ${schoolNameMap.get(schoolId)} (insert error)`
        )
      } else {
        syncedRankings.push({
          rank: rankedTeam.current,
          schoolName: schoolNameMap.get(schoolId) || 'Unknown',
          espnId: espnId || '',
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        year,
        week,
        pollName: apPoll.name,
        totalRanked: apPoll.ranks?.length || 0,
        synced: syncedRankings.length,
        skipped: skippedTeams.length,
      },
      syncedRankings: syncedRankings.sort((a, b) => a.rank - b.rank),
      skippedTeams,
    })
  } catch (error) {
    console.error('Sync rankings error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Rankings sync endpoint',
    usage: 'POST with { year, week } and Authorization: Bearer <SYNC_API_KEY>',
    example: { year: 2024, week: 1 },
  })
}
