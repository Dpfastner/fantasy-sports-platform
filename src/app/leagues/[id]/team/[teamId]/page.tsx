import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { RosterList } from '@/components/RosterList'
import ProposeTradeButton from '@/components/ProposeTradeButton'
import { getLeagueYear } from '@/lib/league-helpers'
import { getCurrentWeek, getSimulatedDate } from '@/lib/week'
import { getEnvironment } from '@/lib/env'
import { calculateSchoolGamePoints, DEFAULT_SCORING } from '@/lib/points/calculator'
import { ensureContrast } from '@/lib/color-utils'

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
  game_time: string | null
  status: string
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  home_team_name: string | null
  away_team_name: string | null
  home_team_logo_url: string | null
  away_team_logo_url: string | null
  quarter: string | null
  clock: string | null
  is_conference_game?: boolean
  is_bowl_game: boolean
  is_playoff_game: boolean
  playoff_round: string | null
}

interface SchoolPoints {
  school_id: string
  week_number: number
  total_points: number
  game_id: string | null
  base_points: number
  conference_bonus: number
  over_50_bonus: number
  shutout_bonus: number
  ranked_25_bonus: number
  ranked_10_bonus: number
}

export default async function TeamViewPage({ params }: PageProps) {
  const { id: leagueId, teamId } = await params
  const supabase = await createClient()
  const adminDb = createAdminClient()

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

  // Get league info (admin to bypass RLS)
  const { data: league, error: leagueError } = await adminDb
    .from('leagues')
    .select('id, name, season_id, seasons(year)')
    .eq('id', leagueId)
    .single()

  if (!league) {
    console.error('[TeamView] League not found:', leagueId, leagueError?.message)
    notFound()
  }

  // Get target team (admin to read other users' teams)
  const { data: team, error: teamError } = await adminDb
    .from('fantasy_teams')
    .select('*, profiles!fantasy_teams_user_id_fkey(display_name, email)')
    .eq('id', teamId)
    .eq('league_id', leagueId)
    .single()

  if (!team) {
    console.error('[TeamView] Team not found:', teamId, 'in league:', leagueId, teamError?.message)
    notFound()
  }

  // If viewing own team, redirect to normal team page
  if (team.user_id === user.id) {
    redirect(`/leagues/${leagueId}/team`)
  }

  // Get user's own team in this league (for trade button)
  const { data: myTeam } = await adminDb
    .from('fantasy_teams')
    .select('id, name, trades_used')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  const year = getLeagueYear(league.seasons)
  const currentWeek = await getCurrentWeek(year)
  const simulatedDate = await getSimulatedDate(year)
  const environment = getEnvironment()

  // Get league settings
  const { data: settings } = await adminDb
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
      points_heisman_winner,
      double_points_enabled,
      max_double_picks_per_season,
      trades_enabled,
      trade_deadline,
      max_trades_per_season,
      schools_per_team
    `)
    .eq('league_id', leagueId)
    .single()

  // Get user's own roster for trade modal
  let myRoster: RosterSchool[] | null = null
  if (myTeam) {
    const { data: myRosterRaw } = await adminDb
      .from('roster_periods')
      .select(`
        id, school_id, slot_number, start_week, end_week,
        schools (id, name, abbreviation, logo_url, conference, primary_color, secondary_color)
      `)
      .eq('fantasy_team_id', myTeam.id)
      .lte('start_week', currentWeek)
      .or(`end_week.is.null,end_week.gt.${currentWeek}`)
      .order('slot_number', { ascending: true })
    myRoster = myRosterRaw as unknown as RosterSchool[] | null
  }

  // Get current roster
  const { data: rosterData } = await adminDb
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
  const mySchoolIds = myRoster?.map(r => r.school_id) || []
  const allSchoolIds = [...new Set([...schoolIds, ...mySchoolIds])]

  // Get all games for roster schools (full data for RosterList)
  let gamesData: Game[] = []
  if (schoolIds.length > 0) {
    const { data } = await adminDb
      .from('games')
      .select('*')
      .eq('season_id', league.season_id)
      .or(`home_school_id.in.(${schoolIds.join(',')}),away_school_id.in.(${schoolIds.join(',')})`)
    gamesData = (data || []) as Game[]
  }

  // Also fetch games for trade modal (my schools)
  let allGamesData = [...gamesData]
  if (mySchoolIds.length > 0) {
    const myOnlySchoolIds = mySchoolIds.filter(id => !schoolIds.includes(id))
    if (myOnlySchoolIds.length > 0) {
      const { data } = await adminDb
        .from('games')
        .select('*')
        .eq('season_id', league.season_id)
        .or(`home_school_id.in.(${myOnlySchoolIds.join(',')}),away_school_id.in.(${myOnlySchoolIds.join(',')})`)
      allGamesData = [...allGamesData, ...(data || []) as Game[]]
    }
  }

  // Fetch conferences for conference game detection
  const gameSchoolIds = new Set<string>()
  for (const game of allGamesData) {
    if (game.home_school_id) gameSchoolIds.add(game.home_school_id)
    if (game.away_school_id) gameSchoolIds.add(game.away_school_id)
  }
  const conferenceMap = new Map<string, string>()
  if (gameSchoolIds.size > 0) {
    const { data: confData } = await adminDb
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

  // Compute league-specific school points (full breakdown for RosterList)
  const computedPoints: SchoolPoints[] = []
  for (const game of allGamesData) {
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

    if (game.home_school_id && allSchoolIds.includes(game.home_school_id)) {
      const opponentRank = game.away_rank != null && game.away_rank < 99 ? game.away_rank : null
      const pts = calculateSchoolGamePoints(calcGame, game.home_school_id, opponentRank, leagueScoring, isBowlGame)
      computedPoints.push({
        school_id: pts.schoolId,
        week_number: pts.weekNumber,
        total_points: pts.totalPoints,
        game_id: pts.gameId,
        base_points: pts.basePoints,
        conference_bonus: pts.conferenceBonus,
        over_50_bonus: pts.over50Bonus,
        shutout_bonus: pts.shutoutBonus,
        ranked_25_bonus: pts.ranked25Bonus,
        ranked_10_bonus: pts.ranked10Bonus,
      })
    }

    if (game.away_school_id && allSchoolIds.includes(game.away_school_id)) {
      const opponentRank = game.home_rank != null && game.home_rank < 99 ? game.home_rank : null
      const pts = calculateSchoolGamePoints(calcGame, game.away_school_id, opponentRank, leagueScoring, isBowlGame)
      computedPoints.push({
        school_id: pts.schoolId,
        week_number: pts.weekNumber,
        total_points: pts.totalPoints,
        game_id: pts.gameId,
        base_points: pts.basePoints,
        conference_bonus: pts.conferenceBonus,
        over_50_bonus: pts.over50Bonus,
        shutout_bonus: pts.shutoutBonus,
        ranked_25_bonus: pts.ranked25Bonus,
        ranked_10_bonus: pts.ranked10Bonus,
      })
    }
  }

  // Split points for this team's roster only (for RosterList)
  const schoolPoints = computedPoints.filter(p => schoolIds.includes(p.school_id))

  // W-L records for this team's roster
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

  // Extended records for trade modal (both teams, with conference records)
  const tradeRecordsMap = new Map<string, { wins: number; losses: number; confWins: number; confLosses: number }>()
  for (const game of allGamesData) {
    if (game.status !== 'completed' || game.home_score === null || game.away_score === null) continue
    const homeWon = game.home_score > game.away_score
    const hConf = game.home_school_id ? conferenceMap.get(game.home_school_id) : null
    const aConf = game.away_school_id ? conferenceMap.get(game.away_school_id) : null
    const isConf = !!(hConf && aConf && hConf === aConf)
    if (game.home_school_id && allSchoolIds.includes(game.home_school_id)) {
      const r = tradeRecordsMap.get(game.home_school_id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
      if (homeWon) { r.wins++; if (isConf) r.confWins++ } else { r.losses++; if (isConf) r.confLosses++ }
      tradeRecordsMap.set(game.home_school_id, r)
    }
    if (game.away_school_id && allSchoolIds.includes(game.away_school_id)) {
      const r = tradeRecordsMap.get(game.away_school_id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
      if (!homeWon) { r.wins++; if (isConf) r.confWins++ } else { r.losses++; if (isConf) r.confLosses++ }
      tradeRecordsMap.set(game.away_school_id, r)
    }
  }

  // Get opponent schools for RosterList (schools that play against roster schools)
  const opponentSchoolIds = new Set<string>()
  for (const game of gamesData) {
    if (game.home_school_id && !schoolIds.includes(game.home_school_id)) {
      opponentSchoolIds.add(game.home_school_id)
    }
    if (game.away_school_id && !schoolIds.includes(game.away_school_id)) {
      opponentSchoolIds.add(game.away_school_id)
    }
  }
  let opponentSchools: { id: string; name: string; abbreviation: string | null; logo_url: string | null; conference: string }[] = []
  if (opponentSchoolIds.size > 0) {
    const { data: oppData } = await adminDb
      .from('schools')
      .select('id, name, abbreviation, logo_url, conference')
      .in('id', Array.from(opponentSchoolIds))
    opponentSchools = oppData || []
  }

  // Fetch double picks for this team
  const { data: doublePicksData } = await adminDb
    .from('weekly_double_picks')
    .select('week_number, school_id')
    .eq('fantasy_team_id', teamId)
  const doublePicks = (doublePicksData || []) as { week_number: number; school_id: string }[]

  // Fetch event bonuses
  const { data: eventBonusesData } = await adminDb
    .from('league_school_event_bonuses')
    .select('school_id, week_number, bonus_type, points')
    .eq('league_id', leagueId)
    .eq('season_id', league.season_id)
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])
    .or(`week_number.lte.${currentWeek},week_number.gte.17`)

  const eventBonuses = (eventBonusesData || []) as {
    school_id: string
    week_number: number
    bonus_type: string
    points: number
  }[]

  // Get current AP rankings for trade modal
  let { data: rankingsData } = await adminDb
    .from('ap_rankings_history')
    .select('school_id, rank')
    .eq('season_id', league.season_id)
    .eq('week_number', currentWeek)

  if (!rankingsData || rankingsData.length === 0) {
    const { data: latestRankings } = await adminDb
      .from('ap_rankings_history')
      .select('school_id, rank, week_number')
      .eq('season_id', league.season_id)
      .lte('week_number', currentWeek)
      .order('week_number', { ascending: false })
      .limit(25)
    rankingsData = latestRankings
  }

  const rankingsMap: Record<string, number> = {}
  for (const r of rankingsData || []) {
    rankingsMap[r.school_id] = r.rank
  }

  // Build school points totals for trade modal
  const schoolPointsMap: Record<string, number> = {}
  for (const p of computedPoints) {
    schoolPointsMap[p.school_id] = (schoolPointsMap[p.school_id] || 0) + p.total_points
  }

  // Prepare trade data
  const tradesEnabled = settings?.trades_enabled !== false
  const tradePastDeadline = settings?.trade_deadline
    ? new Date(settings.trade_deadline + 'T23:59:59') < new Date()
    : false
  const canTrade = !!(myTeam && myRoster && myRoster.length > 0 && tradesEnabled && !tradePastDeadline)

  const myRosterForModal = myRoster?.map(r => ({
    schoolId: r.school_id,
    schoolName: r.schools.name,
    abbreviation: r.schools.abbreviation,
    logoUrl: r.schools.logo_url,
    conference: r.schools.conference,
    slotNumber: r.slot_number,
  })) || []

  const partnerRosterForModal = roster?.map(r => ({
    schoolId: r.school_id,
    schoolName: r.schools.name,
    abbreviation: r.schools.abbreviation,
    logoUrl: r.schools.logo_url,
    conference: r.schools.conference,
    slotNumber: r.slot_number,
  })) || []

  const schoolRecordsForModal: Record<string, { wins: number; losses: number; confWins: number; confLosses: number }> = {}
  for (const [id, rec] of tradeRecordsMap) {
    schoolRecordsForModal[id] = rec
  }

  // Get team standing
  const { data: allTeams } = await adminDb
    .from('fantasy_teams')
    .select('id, total_points')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })

  const standing = (allTeams?.findIndex(t => t.id === teamId) || 0) + 1
  const totalTeams = allTeams?.length || 0

  const ownerName = (team.profiles as { display_name: string | null; email: string } | null)?.display_name
    || (team.profiles as { display_name: string | null; email: string } | null)?.email?.split('@')[0]
    || 'Unknown'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={user.email} userId={user.id}>
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
          <div className="flex justify-between items-start flex-wrap gap-4">
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
                    color: ensureContrast(team.secondary_color || '#ffffff', team.primary_color || '#1a1a1a')
                  }}
                >
                  {team.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: ensureContrast(team.primary_color || '#1f2937', team.secondary_color || '#ffffff') }}
                >
                  {team.name}
                </h1>
                <p style={{ color: `${ensureContrast(team.primary_color || '#1f2937', team.secondary_color || '#ffffff')}99` }} className="text-sm mb-2">
                  Owned by{' '}
                  <Link href={`/profile/${team.user_id}`} className="underline hover:opacity-80">
                    {ownerName}
                  </Link>
                </p>
                <div
                  className="flex items-center gap-6 flex-wrap"
                  style={{ color: `${ensureContrast(team.primary_color || '#1f2937', team.secondary_color || '#ffffff')}cc` }}
                >
                  <span>Standing: <span className="font-semibold" style={{ color: ensureContrast(team.primary_color || '#1f2937', team.secondary_color || '#ffffff') }}>{standing} of {totalTeams}</span></span>
                  <span>Total Points: <span className="font-semibold" style={{ color: ensureContrast(team.primary_color || '#1f2937', team.secondary_color || '#ffffff') }}>{team.total_points}</span></span>
                </div>
              </div>
            </div>
            {canTrade && (
              <ProposeTradeButton
                leagueId={leagueId}
                myTeam={{ id: myTeam!.id, name: myTeam!.name }}
                partnerTeam={{ id: team.id, name: team.name }}
                myRoster={myRosterForModal}
                partnerRoster={partnerRosterForModal}
                schoolPointsMap={schoolPointsMap}
                rankingsMap={rankingsMap}
                schoolRecordsMap={schoolRecordsForModal}
                buttonStyle={{
                  backgroundColor: team.secondary_color || '#ffffff',
                  color: ensureContrast(team.secondary_color || '#ffffff', team.primary_color || '#1a1a1a'),
                }}
                maxRosterSize={settings?.schools_per_team || 12}
              />
            )}
          </div>
        </div>

        {/* Roster Section - using same RosterList component as own team page */}
        <div className="bg-surface rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">{team.name}&apos;s Roster</h2>
            <span className="text-text-secondary text-sm">Week {currentWeek}</span>
          </div>

          {roster && roster.length > 0 ? (
            <RosterList
              roster={roster.map(r => ({
                id: r.id,
                school_id: r.school_id,
                slot_number: r.slot_number,
                start_week: r.start_week,
                schools: r.schools,
              }))}
              games={gamesData}
              schoolPoints={schoolPoints}
              schoolRecordsMap={Object.fromEntries(schoolRecordsMap)}
              currentWeek={currentWeek}
              teamId={teamId}
              seasonId={league.season_id}
              doublePointsEnabled={settings?.double_points_enabled || false}
              maxDoublePicksPerSeason={settings?.max_double_picks_per_season || 0}
              opponentSchools={opponentSchools}
              doublePicks={doublePicks}
              environment={environment}
              simulatedDateISO={simulatedDate.toISOString()}
              specialEventSettings={{
                bowlAppearance: settings?.points_bowl_appearance || 0,
                playoffFirstRound: settings?.points_playoff_first_round || 0,
                playoffQuarterfinal: settings?.points_playoff_quarterfinal || 0,
                playoffSemifinal: settings?.points_playoff_semifinal || 0,
                championshipWin: settings?.points_championship_win || 0,
                championshipLoss: settings?.points_championship_loss || 0,
                confChampWin: settings?.points_conference_championship_win || 0,
                confChampLoss: settings?.points_conference_championship_loss || 0,
                heismanWinner: settings?.points_heisman_winner || 0,
              }}
              eventBonuses={eventBonuses}
            />
          ) : (
            <p className="text-text-muted">This team hasn&apos;t drafted yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
