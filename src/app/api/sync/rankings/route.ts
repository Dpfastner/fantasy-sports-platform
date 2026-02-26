import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchRankings, fetchCFPRankings, fetchRankingsFromWebsite, ParsedRanking } from '@/lib/api/espn'

interface SyncRankingsRequest {
  year?: number
  week?: number
  seasonType?: number // 1 = preseason, 2 = regular, 3 = final
  backfillAll?: boolean // Set true to sync all weeks
  useCFP?: boolean // Set true to fetch CFP rankings (poll 22)
  useWebsite?: boolean // Set true to scrape ESPN website for historical data
}

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SyncRankingsRequest = await request.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()
    const week = body.week || 1
    const seasonType = body.seasonType || 2
    const backfillAll = body.backfillAll || false
    const useCFP = body.useCFP || false
    const useWebsite = body.useWebsite ?? true // Default to website scraping for historical data

    // Handle backfill all weeks
    if (backfillAll) {
      return await handleBackfillAllFromWebsite(year)
    }

    console.log(`Fetching rankings for ${year} week ${week} (seasonType: ${seasonType}, CFP: ${useCFP})...`)

    // Fetch rankings from ESPN with week-specific parameters
    const rankingsData = useCFP
      ? await fetchCFPRankings(year, week)
      : await fetchRankings(year, week, seasonType)

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
    const { data: season } = await createAdminClient()
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
    const { data: schools } = await createAdminClient()
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
    await createAdminClient()
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

      const { error: insertError } = await createAdminClient()
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
    usage: 'POST with { year, week, seasonType?, backfillAll?, useCFP? } and Authorization: Bearer <SYNC_API_KEY>',
    examples: [
      { description: 'Current week rankings', body: { year: 2025, week: 10 } },
      { description: 'Preseason rankings', body: { year: 2025, week: 1, seasonType: 1 } },
      { description: 'CFP rankings (week 10+)', body: { year: 2025, week: 12, useCFP: true } },
      { description: 'Final rankings', body: { year: 2025, week: 1, seasonType: 3 } },
      { description: 'Backfill entire season', body: { year: 2025, backfillAll: true } },
    ],
    seasonTypes: {
      1: 'Preseason',
      2: 'Regular season (default)',
      3: 'Final/postseason',
    },
  })
}

/**
 * Handle backfilling all rankings for a season
 */
async function handleBackfillAll(year: number, request: Request) {
  console.log(`Starting full backfill for ${year} season...`)

  const supabase = createAdminClient()

  // Get season ID
  const { data: season } = await supabase
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
    }
    schoolNameMap.set(school.id, school.name)
  }

  const results: Array<{
    week: number
    seasonType: number
    synced: number
    skipped: number
  }> = []

  // Sync preseason (week 0, seasonType 1)
  try {
    console.log('Fetching preseason rankings...')
    const presasonData = await fetchRankings(year, 1, 1)
    const preseasonResult = await syncWeekRankings(
      supabase, season.id, 0, presasonData, schoolMap, schoolNameMap
    )
    results.push({ week: 0, seasonType: 1, ...preseasonResult })
  } catch (err) {
    console.warn('Preseason rankings not available:', err)
  }

  // Sync regular season weeks 1-15
  for (let week = 1; week <= 15; week++) {
    try {
      console.log(`Fetching week ${week} rankings...`)
      const weekData = await fetchRankings(year, week, 2)
      const weekResult = await syncWeekRankings(
        supabase, season.id, week, weekData, schoolMap, schoolNameMap
      )
      results.push({ week, seasonType: 2, ...weekResult })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      console.warn(`Week ${week} rankings not available:`, err)
    }
  }

  // Sync week 16 (bowl week)
  try {
    console.log('Fetching week 16 rankings...')
    const week16Data = await fetchRankings(year, 16, 2)
    const week16Result = await syncWeekRankings(
      supabase, season.id, 16, week16Data, schoolMap, schoolNameMap
    )
    results.push({ week: 16, seasonType: 2, ...week16Result })
  } catch (err) {
    console.warn('Week 16 rankings not available:', err)
  }

  // Try to sync final rankings
  try {
    console.log('Fetching final rankings...')
    const finalData = await fetchRankings(year, 1, 3)
    const finalResult = await syncWeekRankings(
      supabase, season.id, 17, finalData, schoolMap, schoolNameMap
    )
    results.push({ week: 17, seasonType: 3, ...finalResult })
  } catch (err) {
    console.warn('Final rankings not available:', err)
  }

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

  return NextResponse.json({
    success: true,
    summary: {
      year,
      weeksProcessed: results.length,
      totalSynced,
      totalSkipped,
    },
    weeklyResults: results,
  })
}

/**
 * Sync rankings for a single week
 */
async function syncWeekRankings(
  supabase: ReturnType<typeof createAdminClient>,
  seasonId: string,
  weekNumber: number,
  rankingsData: Awaited<ReturnType<typeof fetchRankings>>,
  schoolMap: Map<string, string>,
  schoolNameMap: Map<string, string>
): Promise<{ synced: number; skipped: number }> {
  // Find the AP Top 25 poll
  const apPoll = rankingsData.rankings?.find(
    r => r.name.toLowerCase().includes('ap') || r.type === 'ap'
  )

  if (!apPoll || !apPoll.ranks?.length) {
    return { synced: 0, skipped: 0 }
  }

  // Clear existing rankings for this week
  await supabase
    .from('ap_rankings_history')
    .delete()
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)

  let synced = 0
  let skipped = 0

  // Insert new rankings
  for (const rankedTeam of apPoll.ranks) {
    const espnId = rankedTeam.team?.id
    const schoolId = espnId ? schoolMap.get(espnId) : null

    if (!schoolId) {
      skipped++
      continue
    }

    const { error } = await supabase
      .from('ap_rankings_history')
      .insert({
        season_id: seasonId,
        week_number: weekNumber,
        school_id: schoolId,
        rank: rankedTeam.current,
      })

    if (error) {
      skipped++
    } else {
      synced++
    }
  }

  return { synced, skipped }
}

/**
 * Handle backfilling all rankings from ESPN website (historical data)
 */
async function handleBackfillAllFromWebsite(year: number) {
  console.log(`Starting full rankings backfill from ESPN website for ${year} season...`)

  const supabase = createAdminClient()

  // Get season ID
  const { data: season } = await supabase
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
  const { data: schools } = await supabase
    .from('schools')
    .select('id, external_api_id, name')
    .not('external_api_id', 'is', null)

  const schoolMap = new Map<string, string>()
  const schoolNameMap = new Map<string, string>()
  for (const school of schools || []) {
    if (school.external_api_id) {
      schoolMap.set(school.external_api_id, school.id)
      // Also map by name for fallback matching
      schoolNameMap.set(school.name.toLowerCase(), school.id)
    }
  }

  const results: Array<{
    week: number
    seasonType: number
    synced: number
    skipped: number
  }> = []

  // Sync preseason (week 1, seasonType 1)
  try {
    console.log('Fetching preseason rankings from website...')
    const rankings = await fetchRankingsFromWebsite(year, 1, 1)
    const result = await syncParsedRankings(supabase, season.id, 0, rankings, schoolMap, schoolNameMap)
    results.push({ week: 0, seasonType: 1, ...result })
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (err) {
    console.warn('Preseason rankings not available:', err)
  }

  // Sync regular season weeks 1-15
  for (let week = 1; week <= 15; week++) {
    try {
      console.log(`Fetching week ${week} rankings from website...`)
      const rankings = await fetchRankingsFromWebsite(year, week, 2)
      const result = await syncParsedRankings(supabase, season.id, week, rankings, schoolMap, schoolNameMap)
      results.push({ week, seasonType: 2, ...result })

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      console.warn(`Week ${week} rankings not available:`, err)
    }
  }

  // Try week 16 (bowl week)
  try {
    console.log('Fetching week 16 rankings from website...')
    const rankings = await fetchRankingsFromWebsite(year, 16, 2)
    const result = await syncParsedRankings(supabase, season.id, 16, rankings, schoolMap, schoolNameMap)
    results.push({ week: 16, seasonType: 2, ...result })
  } catch (err) {
    console.warn('Week 16 rankings not available:', err)
  }

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

  return NextResponse.json({
    success: true,
    method: 'website_scraping',
    summary: {
      year,
      weeksProcessed: results.length,
      totalSynced,
      totalSkipped,
    },
    weeklyResults: results,
  })
}

/**
 * Sync parsed rankings from website scraping
 */
async function syncParsedRankings(
  supabase: ReturnType<typeof createAdminClient>,
  seasonId: string,
  weekNumber: number,
  rankings: ParsedRanking[],
  schoolMap: Map<string, string>,
  schoolNameMap: Map<string, string>
): Promise<{ synced: number; skipped: number }> {
  if (!rankings.length) {
    return { synced: 0, skipped: 0 }
  }

  // Clear existing rankings for this week
  await supabase
    .from('ap_rankings_history')
    .delete()
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)

  let synced = 0
  let skipped = 0

  for (const ranking of rankings) {
    // Try to match by ESPN team ID first, then by name
    let schoolId = ranking.teamId ? schoolMap.get(ranking.teamId) : null

    if (!schoolId && ranking.teamName) {
      // Try name-based matching
      const normalizedName = ranking.teamName.toLowerCase()
      schoolId = schoolNameMap.get(normalizedName) || null
    }

    if (!schoolId) {
      console.warn(`Could not match team: ${ranking.teamName} (ID: ${ranking.teamId})`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from('ap_rankings_history')
      .insert({
        season_id: seasonId,
        week_number: weekNumber,
        school_id: schoolId,
        rank: ranking.rank,
        previous_rank: ranking.previousRank,
      })

    if (error) {
      console.error(`Error inserting ranking for ${ranking.teamName}:`, error)
      skipped++
    } else {
      synced++
    }
  }

  return { synced, skipped }
}
