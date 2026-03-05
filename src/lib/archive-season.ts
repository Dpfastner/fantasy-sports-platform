import { SupabaseClient } from '@supabase/supabase-js'
import { getLeagueYear } from '@/lib/league-helpers'
import { getCurrentWeek } from '@/lib/week'

/**
 * Archive a league's season into `league_seasons` with v2 final_standings.
 * Used by both the manual POST route and the auto-archive cron.
 *
 * Returns { success, seasonYear, champion } or throws on error.
 */
export async function archiveLeagueSeason(
  supabase: SupabaseClient,
  leagueId: string
): Promise<{ success: true; seasonYear: number; championUserId: string | null }> {
  // Get league with season info
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, season_id, seasons(year, name)')
    .eq('id', leagueId)
    .single()

  if (!league) {
    throw new Error('League not found')
  }

  const seasonYear = getLeagueYear(league.seasons)
  const currentWeek = await getCurrentWeek(seasonYear)

  // Check if already archived for this year
  const { data: existing } = await supabase
    .from('league_seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('season_year', seasonYear)
    .single()

  if (existing) {
    throw new Error('ALREADY_ARCHIVED')
  }

  // Fetch teams with profiles and high points winnings
  const { data: teams } = await supabase
    .from('fantasy_teams')
    .select(`
      id,
      name,
      user_id,
      high_points_winnings,
      profiles!fantasy_teams_user_id_fkey(display_name, email)
    `)
    .eq('league_id', leagueId)

  const teamIds = (teams || []).map(t => t.id)
  const safeTeamIds = teamIds.length > 0 ? teamIds : ['none']

  // Fetch all weekly points (including high points flags)
  const { data: weeklyPoints } = await supabase
    .from('fantasy_team_weekly_points')
    .select('fantasy_team_id, week_number, points, is_high_points_winner, high_points_amount')
    .in('fantasy_team_id', safeTeamIds)
    .lte('week_number', currentWeek)
    .order('week_number', { ascending: true })

  // Fetch current rosters with school info
  const { data: rosterData } = await supabase
    .from('roster_periods')
    .select('fantasy_team_id, school_id, schools(name, conference)')
    .in('fantasy_team_id', safeTeamIds)
    .is('end_week', null)

  // Fetch league settings for prize pool info
  const { data: settingsData } = await supabase
    .from('league_settings')
    .select('entry_fee, prize_pool, high_points_enabled, high_points_weekly_amount')
    .eq('league_id', leagueId)
    .single()

  // Group weekly points by team
  const weeklyByTeam = new Map<string, { week: number; points: number; isHighPoints: boolean }[]>()
  const totalsByTeam = new Map<string, number>()
  for (const wp of weeklyPoints || []) {
    const current = totalsByTeam.get(wp.fantasy_team_id) || 0
    totalsByTeam.set(wp.fantasy_team_id, current + Number(wp.points))

    if (!weeklyByTeam.has(wp.fantasy_team_id)) weeklyByTeam.set(wp.fantasy_team_id, [])
    weeklyByTeam.get(wp.fantasy_team_id)!.push({
      week: wp.week_number,
      points: Number(wp.points),
      isHighPoints: wp.is_high_points_winner,
    })
  }

  // Group rosters by team
  const rosterByTeam = new Map<string, { school: string; conference: string }[]>()
  for (const r of rosterData || []) {
    if (!rosterByTeam.has(r.fantasy_team_id)) rosterByTeam.set(r.fantasy_team_id, [])
    const school = r.schools as unknown as { name: string; conference: string } | null
    if (school) {
      rosterByTeam.get(r.fantasy_team_id)!.push({
        school: school.name,
        conference: school.conference || '',
      })
    }
  }

  // Build high points winners per week
  const highPointsByWeek = new Map<number, { highPoints: number; winners: string[] }>()
  for (const wp of weeklyPoints || []) {
    if (wp.is_high_points_winner) {
      const team = teams?.find(t => t.id === wp.fantasy_team_id)
      if (!highPointsByWeek.has(wp.week_number)) {
        highPointsByWeek.set(wp.week_number, { highPoints: Number(wp.points), winners: [] })
      }
      if (team) {
        highPointsByWeek.get(wp.week_number)!.winners.push(team.name)
      }
    }
  }

  // Build v2 standings
  const standings = (teams || []).map(team => {
    const profile = team.profiles as unknown as { display_name: string | null; email: string }
    const teamWeekly = weeklyByTeam.get(team.id) || []
    const teamRoster = rosterByTeam.get(team.id) || []

    return {
      teamId: team.id,
      teamName: team.name,
      userId: team.user_id,
      userName: profile?.display_name || profile?.email?.split('@')[0] || 'Unknown',
      totalPoints: totalsByTeam.get(team.id) || 0,
      winnings: Number(team.high_points_winnings) || 0,
      rank: 0,
      weeklyPoints: teamWeekly.map(wp => ({
        week: wp.week,
        label: `Week ${wp.week}`,
        points: wp.points,
      })),
      roster: teamRoster.map(r => ({
        school: r.school,
        conference: r.conference,
        record: '',
        points: 0,
      })),
    }
  })
  .sort((a, b) => b.totalPoints - a.totalPoints)
  .map((team, index) => ({ ...team, rank: index + 1 }))

  const championUserId = standings.length > 0 ? standings[0].userId : null

  // Build high points array
  const highPointsWinners = [...highPointsByWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, data]) => ({
      week,
      label: `Week ${week}`,
      highPoints: data.highPoints,
      winners: data.winners,
    }))

  const finalStandings = {
    version: 2,
    standings,
    highPointsWinners,
    seasonNotes: {
      entryFee: settingsData?.entry_fee || 0,
      totalPrizePool: settingsData?.prize_pool || 0,
    },
  }

  // Insert archive
  const { error: insertError } = await supabase
    .from('league_seasons')
    .insert({
      league_id: leagueId,
      season_year: seasonYear,
      final_standings: finalStandings,
      champion_user_id: championUserId,
      archived_at: new Date().toISOString(),
    })

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error('ALREADY_ARCHIVED')
    }
    throw new Error(`Failed to archive: ${insertError.message}`)
  }

  return { success: true, seasonYear, championUserId }
}
