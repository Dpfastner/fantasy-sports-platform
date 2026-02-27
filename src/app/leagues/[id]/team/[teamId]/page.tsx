import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { getLeagueYear } from '@/lib/league-helpers'
import { getCurrentWeek } from '@/lib/week'
import { calculateSchoolGamePoints, DEFAULT_SCORING } from '@/lib/points/calculator'
import {
  REGULAR_WEEK_COUNT,
  SCHEDULE_WEEK_LABELS,
  ROSTER_SPECIAL_COLUMNS,
} from '@/lib/constants/season'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string; teamId: string }>
}

interface RosterSchool {
  id: string
  school_id: string
  slot_number: number
  start_week: number
  end_week: number | null
  schools: {
    id: string
    name: string
    abbreviation: string | null
    logo_url: string | null
    conference: string
    primary_color: string
    secondary_color: string
  }
}

interface Game {
  id: string
  week_number: number
  game_date: string
  status: string
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  is_bowl_game: boolean
  is_playoff_game: boolean
  playoff_round: string | null
}

interface SchoolPoints {
  school_id: string
  week_number: number
  total_points: number
}

export default async function TeamViewPage({ params }: PageProps) {
  const { id: leagueId, teamId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for header
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Get league info
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, season_id, seasons(year)')
    .eq('id', leagueId)
    .single()

  if (!league) {
    notFound()
  }

  // Get target team
  const { data: team } = await supabase
    .from('fantasy_teams')
    .select('*, profiles(display_name, email)')
    .eq('id', teamId)
    .eq('league_id', leagueId)
    .single()

  if (!team) {
    notFound()
  }

  // If viewing own team, redirect to normal team page
  if (team.user_id === user.id) {
    redirect(`/leagues/${leagueId}/team`)
  }

  const year = getLeagueYear(league.seasons)
  const currentWeek = await getCurrentWeek(year)

  // Get league settings for scoring
  const { data: settings } = await supabase
    .from('league_settings')
    .select(`
      points_win, points_conference_game, points_over_50, points_shutout, points_ranked_25, points_ranked_10,
      points_loss, points_conference_game_loss, points_over_50_loss, points_shutout_loss, points_ranked_25_loss, points_ranked_10_loss,
      points_bowl_appearance,
      points_playoff_first_round,
      points_playoff_quarterfinal,
      points_playoff_semifinal,
      points_championship_win,
      points_championship_loss,
      points_conference_championship_win,
      points_conference_championship_loss,
      points_heisman_winner
    `)
    .eq('league_id', leagueId)
    .single()

  // Get current roster
  const { data: rosterData } = await supabase
    .from('roster_periods')
    .select(`
      id, school_id, slot_number, start_week, end_week,
      schools (id, name, abbreviation, logo_url, conference, primary_color, secondary_color)
    `)
    .eq('fantasy_team_id', teamId)
    .lte('start_week', currentWeek)
    .or(`end_week.is.null,end_week.gt.${currentWeek}`)
    .order('slot_number', { ascending: true })

  const roster = rosterData as unknown as RosterSchool[] | null
  const schoolIds = roster?.map(r => r.school_id) || []

  // Get all games for roster schools
  let gamesData: Game[] = []
  if (schoolIds.length > 0) {
    const { data } = await supabase
      .from('games')
      .select('id, week_number, game_date, status, home_school_id, away_school_id, home_score, away_score, home_rank, away_rank, is_bowl_game, is_playoff_game, playoff_round')
      .eq('season_id', league.season_id)
      .or(`home_school_id.in.(${schoolIds.join(',')}),away_school_id.in.(${schoolIds.join(',')})`)
    gamesData = (data || []) as Game[]
  }

  // Fetch conferences for conference game detection
  const gameSchoolIds = new Set<string>()
  for (const game of gamesData) {
    if (game.home_school_id) gameSchoolIds.add(game.home_school_id)
    if (game.away_school_id) gameSchoolIds.add(game.away_school_id)
  }
  const conferenceMap = new Map<string, string>()
  if (gameSchoolIds.size > 0) {
    const { data: confData } = await supabase
      .from('schools')
      .select('id, conference')
      .in('id', Array.from(gameSchoolIds))
    for (const s of confData || []) {
      conferenceMap.set(s.id, s.conference)
    }
  }

  // Build scoring settings
  const leagueScoring = settings ? {
    points_win: Number(settings.points_win),
    points_conference_game: Number(settings.points_conference_game),
    points_over_50: Number(settings.points_over_50),
    points_shutout: Number(settings.points_shutout),
    points_ranked_25: Number(settings.points_ranked_25),
    points_ranked_10: Number(settings.points_ranked_10),
    points_loss: Number(settings.points_loss),
    points_conference_game_loss: Number(settings.points_conference_game_loss),
    points_over_50_loss: Number(settings.points_over_50_loss),
    points_shutout_loss: Number(settings.points_shutout_loss),
    points_ranked_25_loss: Number(settings.points_ranked_25_loss),
    points_ranked_10_loss: Number(settings.points_ranked_10_loss),
  } : DEFAULT_SCORING

  // Compute league-specific school points
  const computedPoints: SchoolPoints[] = []
  for (const game of gamesData) {
    if (game.status !== 'completed') continue
    if (game.week_number > currentWeek && game.week_number <= 16) continue

    const homeConf = game.home_school_id ? conferenceMap.get(game.home_school_id) : null
    const awayConf = game.away_school_id ? conferenceMap.get(game.away_school_id) : null
    const isConferenceGame = !!(homeConf && awayConf && homeConf === awayConf)
    const isBowlGame = game.is_bowl_game || false

    const calcGame = {
      id: game.id,
      season_id: league.season_id,
      week_number: game.week_number,
      home_school_id: game.home_school_id,
      away_school_id: game.away_school_id,
      home_score: game.home_score ?? 0,
      away_score: game.away_score ?? 0,
      home_rank: game.home_rank,
      away_rank: game.away_rank,
      status: game.status,
      is_conference_game: isConferenceGame,
      is_bowl_game: isBowlGame,
      is_playoff_game: game.is_playoff_game || false,
      playoff_round: game.playoff_round || null,
    }

    if (game.home_school_id && schoolIds.includes(game.home_school_id)) {
      const opponentRank = game.away_rank != null && game.away_rank < 99 ? game.away_rank : null
      const pts = calculateSchoolGamePoints(calcGame, game.home_school_id, opponentRank, leagueScoring, isBowlGame)
      computedPoints.push({
        school_id: pts.schoolId,
        week_number: pts.weekNumber,
        total_points: pts.totalPoints,
      })
    }

    if (game.away_school_id && schoolIds.includes(game.away_school_id)) {
      const opponentRank = game.home_rank != null && game.home_rank < 99 ? game.home_rank : null
      const pts = calculateSchoolGamePoints(calcGame, game.away_school_id, opponentRank, leagueScoring, isBowlGame)
      computedPoints.push({
        school_id: pts.schoolId,
        week_number: pts.weekNumber,
        total_points: pts.totalPoints,
      })
    }
  }

  // W-L records
  const schoolRecordsMap = new Map<string, { wins: number; losses: number }>()
  for (const game of gamesData) {
    if (game.status !== 'completed' || game.home_score === null || game.away_score === null) continue
    const homeWon = game.home_score > game.away_score
    if (game.home_school_id && schoolIds.includes(game.home_school_id)) {
      const r = schoolRecordsMap.get(game.home_school_id) || { wins: 0, losses: 0 }
      if (homeWon) r.wins++; else r.losses++
      schoolRecordsMap.set(game.home_school_id, r)
    }
    if (game.away_school_id && schoolIds.includes(game.away_school_id)) {
      const r = schoolRecordsMap.get(game.away_school_id) || { wins: 0, losses: 0 }
      if (!homeWon) r.wins++; else r.losses++
      schoolRecordsMap.set(game.away_school_id, r)
    }
  }

  // Get team standing
  const { data: allTeams } = await supabase
    .from('fantasy_teams')
    .select('id, total_points')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })

  const standing = (allTeams?.findIndex(t => t.id === teamId) || 0) + 1
  const totalTeams = allTeams?.length || 0

  const ownerName = (team.profiles as { display_name: string | null; email: string } | null)?.display_name
    || (team.profiles as { display_name: string | null; email: string } | null)?.email?.split('@')[0]
    || 'Unknown'

  // Build week columns
  const regularWeeks = Array.from({ length: REGULAR_WEEK_COUNT + 1 }, (_, i) => i)
  const specialWeeks = ROSTER_SPECIAL_COLUMNS.map(c => c.week)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={user.email}>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          {league.name}
        </Link>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link href={`/leagues/${leagueId}`} className="text-text-secondary hover:text-text-primary transition-colors">
            &larr; Back to {league.name}
          </Link>
        </div>

        {/* Team Header */}
        <div
          className="rounded-lg p-6 mb-8"
          style={{
            backgroundColor: team.primary_color || '#1f2937',
            borderLeft: `4px solid ${team.secondary_color || '#ffffff'}`
          }}
        >
          <div className="flex items-center gap-4">
            {team.image_url ? (
              <img
                src={team.image_url}
                alt={team.name}
                className="w-16 h-16 object-contain rounded-lg bg-white/10 p-1"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                style={{
                  backgroundColor: team.secondary_color || '#ffffff',
                  color: team.primary_color || '#1a1a1a'
                }}
              >
                {team.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1
                className="text-3xl font-bold mb-1"
                style={{ color: team.secondary_color || '#ffffff' }}
              >
                {team.name}
              </h1>
              <p style={{ color: `${team.secondary_color || '#ffffff'}99` }} className="text-sm mb-2">
                Owned by{' '}
                <Link href={`/profile/${team.user_id}`} className="underline hover:opacity-80">
                  {ownerName}
                </Link>
              </p>
              <div
                className="flex items-center gap-6 flex-wrap"
                style={{ color: `${team.secondary_color || '#ffffff'}cc` }}
              >
                <span>Standing: <span className="font-semibold" style={{ color: team.secondary_color || '#ffffff' }}>{standing} of {totalTeams}</span></span>
                <span>Total Points: <span className="font-semibold" style={{ color: team.secondary_color || '#ffffff' }}>{team.total_points}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        <div className="bg-surface rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Roster</h2>
            <span className="text-text-secondary text-sm">Week {currentWeek}</span>
          </div>

          {roster && roster.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
                    <th className="py-2 px-2 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left">School</th>
                    <th className="py-2 px-2 text-center">Record</th>
                    <th className="py-2 px-2 text-right">Total</th>
                    {regularWeeks.map(w => (
                      <th key={w} className="py-2 px-1 text-center min-w-[36px]">
                        {SCHEDULE_WEEK_LABELS?.[w] || `W${w}`}
                      </th>
                    ))}
                    {specialWeeks.map(w => {
                      const col = ROSTER_SPECIAL_COLUMNS.find(c => c.week === w)
                      return (
                        <th key={w} className="py-2 px-1 text-center min-w-[36px]">
                          {col?.label || `W${w}`}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((slot, idx) => {
                    const school = slot.schools
                    const record = schoolRecordsMap.get(slot.school_id)
                    const schoolPts = computedPoints.filter(p => p.school_id === slot.school_id)
                    const total = schoolPts.reduce((s, p) => s + p.total_points, 0)

                    return (
                      <tr key={slot.id} className="border-b border-surface-subtle hover:bg-surface-subtle/50">
                        <td className="py-3 px-2 text-text-muted">{idx + 1}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {school.logo_url ? (
                              <img src={school.logo_url} alt={school.name} className="w-6 h-6 object-contain" />
                            ) : (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ backgroundColor: school.primary_color }}
                              >
                                {school.abbreviation || school.name.substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <p className="text-text-primary font-medium">{school.name}</p>
                              <p className="text-text-muted text-[10px]">{school.conference}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-text-secondary">
                          {record ? `${record.wins}-${record.losses}` : '-'}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-text-primary">{total}</td>
                        {regularWeeks.map(w => {
                          const wp = schoolPts.find(p => p.week_number === w)
                          return (
                            <td key={w} className="py-3 px-1 text-center text-xs">
                              {wp ? (
                                <span className={wp.total_points > 0 ? 'text-success-text' : wp.total_points < 0 ? 'text-danger-text' : 'text-text-muted'}>
                                  {wp.total_points}
                                </span>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </td>
                          )
                        })}
                        {specialWeeks.map(w => {
                          const wp = schoolPts.find(p => p.week_number === w)
                          return (
                            <td key={w} className="py-3 px-1 text-center text-xs">
                              {wp ? (
                                <span className={wp.total_points > 0 ? 'text-success-text' : wp.total_points < 0 ? 'text-danger-text' : 'text-text-muted'}>
                                  {wp.total_points}
                                </span>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-muted">This team hasn&apos;t drafted yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
