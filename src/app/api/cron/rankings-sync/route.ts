import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchRankings } from '@/lib/api/espn'
import { areCronsEnabled, getEnvironment } from '@/lib/env'
import { calculateCurrentWeek } from '@/lib/constants/season'

function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Fail closed: reject if CRON_SECRET is not set or doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return false
  }

  return true
}

export async function GET(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Skip cron jobs in non-production environments
    if (!areCronsEnabled()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Crons disabled in ${getEnvironment()} environment`,
        timestamp: new Date().toISOString(),
      })
    }

    const supabase = createAdminClient()
    const year = new Date().getFullYear()

    // Get current season
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

    // Calculate current week
    const currentWeek = calculateCurrentWeek(year)

    // Fetch rankings from ESPN
    const rankingsData = await fetchRankings(year)
    const apPoll = rankingsData.rankings?.find(
      r => r.name.toLowerCase().includes('ap') || r.type === 'ap'
    )

    if (!apPoll || !apPoll.ranks) {
      return NextResponse.json({ error: 'AP Top 25 poll not found' }, { status: 404 })
    }

    // Get previous week's rankings for movement calculation
    const { data: prevRankings } = await supabase
      .from('ap_rankings_history')
      .select('school_id, rank')
      .eq('season_id', season.id)
      .eq('week_number', currentWeek - 1)

    const prevRankMap = new Map<string, number>()
    for (const pr of prevRankings || []) {
      prevRankMap.set(pr.school_id, pr.rank)
    }

    // Clear existing rankings for current week
    await supabase
      .from('ap_rankings_history')
      .delete()
      .eq('season_id', season.id)
      .eq('week_number', currentWeek)

    const synced: Array<{ rank: number; name: string; previousRank: number | null }> = []
    const skipped: string[] = []

    // Insert new rankings
    for (const rankedTeam of apPoll.ranks) {
      const espnId = rankedTeam.team?.id
      const schoolId = espnId ? schoolMap.get(espnId) : null

      if (!schoolId) {
        skipped.push(`#${rankedTeam.current} ${rankedTeam.team?.displayName || 'Unknown'}`)
        continue
      }

      const previousRank = prevRankMap.get(schoolId) || null

      const { error } = await supabase
        .from('ap_rankings_history')
        .insert({
          season_id: season.id,
          week_number: currentWeek,
          school_id: schoolId,
          rank: rankedTeam.current,
          previous_rank: previousRank,
        })

      if (!error) {
        synced.push({
          rank: rankedTeam.current,
          name: schoolNameMap.get(schoolId) || 'Unknown',
          previousRank,
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      year,
      week: currentWeek,
      pollName: apPoll.name,
      synced: synced.length,
      skipped: skipped.length,
      rankings: synced.sort((a, b) => a.rank - b.rank),
    })
  } catch (error) {
    console.error('Rankings sync cron error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
