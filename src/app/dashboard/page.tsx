import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { FanZoneWidget } from '@/components/FanZoneWidget'
import { getCurrentWeek } from '@/lib/week'
import { getRival } from '@/lib/rivalries'
import { isLightColor } from '@/lib/color-utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, email, favorite_school_id')
    .eq('id', user.id)
    .single() as { data: { display_name: string | null; email: string; favorite_school_id: string | null } | null; error: unknown }

  // Get user's leagues (as member or commissioner)
  const { data: leagueMemberships, error: leagueError } = await supabase
    .from('league_members')
    .select(`
      role,
      leagues (
        id,
        name,
        sport_id,
        status,
        seasons (
          year,
          name
        ),
        sports (
          name,
          slug
        )
      )
    `)
    .eq('user_id', user.id)

  // Show error state if critical queries fail (#19)
  const queryFailed = profileError || leagueError

  interface LeagueMembership {
    role: string
    leagues: {
      id: string
      name: string
      sport_id: string
      status: string | null
      seasons: { year: number; name: string } | null
      sports: { name: string; slug: string } | null
    } | null
  }

  const allLeagues = (leagueMemberships as LeagueMembership[] | null)?.map(m => ({
    ...m.leagues,
    role: m.role
  })).filter(l => l.id) || []

  const leagues = allLeagues.filter(l => l.status !== 'dormant')
  const dormantLeagues = allLeagues.filter(l => l.status === 'dormant')

  // Get user's teams for rank info
  const leagueIds = allLeagues.map(l => l.id)
  let userTeamMap: Record<string, { rank: number; totalTeams: number }> = {}

  if (leagueIds.length > 0) {
    // Get all teams across user's leagues with total_points for ranking
    const { data: allTeams } = await supabase
      .from('fantasy_teams')
      .select('id, league_id, user_id, total_points')
      .in('league_id', leagueIds)
      .order('total_points', { ascending: false })

    if (allTeams) {
      // Group by league and calculate ranks
      const teamsByLeague: Record<string, typeof allTeams> = {}
      for (const team of allTeams) {
        if (!teamsByLeague[team.league_id]) teamsByLeague[team.league_id] = []
        teamsByLeague[team.league_id].push(team)
      }
      for (const [lid, teams] of Object.entries(teamsByLeague)) {
        const userRank = teams.findIndex(t => t.user_id === user.id) + 1
        if (userRank > 0) {
          userTeamMap[lid] = { rank: userRank, totalTeams: teams.length }
        }
      }
    }
  }

  // Get current week
  const firstLeagueYear = leagues[0]?.seasons
  const year = Array.isArray(firstLeagueYear) ? firstLeagueYear[0]?.year : (firstLeagueYear as { year: number } | null)?.year
  const currentWeek = await getCurrentWeek(year || 2025)

  // Fan Zone data
  let userSchool: { name: string; abbreviation: string | null; logo_url: string | null; primary_color: string; secondary_color: string } | null = null
  let fanDistribution: { schoolName: string; count: number; color: string; logoUrl: string | null }[] = []
  let totalFans = 0
  let rivalSchool: { name: string; count: number } | null = null

  if (profile?.favorite_school_id) {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name, abbreviation, logo_url, primary_color, secondary_color')
      .eq('id', profile.favorite_school_id)
      .single()
    userSchool = schoolData
  }

  // Fetch fan distribution (all users with a favorite school)
  const { data: fanProfiles } = await supabase
    .from('profiles')
    .select('favorite_school_id, schools(name, primary_color, secondary_color, logo_url)')
    .not('favorite_school_id', 'is', null)

  if (fanProfiles && fanProfiles.length > 0) {
    // Aggregate by school — use secondary_color when primary is too light (e.g. white)
    const counts = new Map<string, { name: string; count: number; color: string; logoUrl: string | null }>()
    for (const fp of fanProfiles) {
      const school = fp.schools as unknown as { name: string; primary_color: string; secondary_color: string; logo_url: string | null } | null
      if (!school || !fp.favorite_school_id) continue
      const existing = counts.get(fp.favorite_school_id)
      if (existing) {
        existing.count++
      } else {
        const chartColor = isLightColor(school.primary_color) ? school.secondary_color : school.primary_color
        counts.set(fp.favorite_school_id, {
          name: school.name,
          count: 1,
          color: chartColor,
          logoUrl: school.logo_url,
        })
      }
    }

    fanDistribution = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(e => ({ schoolName: e.name, count: e.count, color: e.color, logoUrl: e.logoUrl }))
    totalFans = fanProfiles.length

    // Check for rivalry
    if (userSchool) {
      const rivalName = getRival(userSchool.name)
      if (rivalName) {
        const rivalEntry = Array.from(counts.values()).find(e => e.name === rivalName)
        if (rivalEntry) {
          rivalSchool = { name: rivalName, count: rivalEntry.count }
        } else {
          rivalSchool = { name: rivalName, count: 0 }
        }
      }
    }
  }

  // Event pools the user is in
  const admin = createAdminClient()
  const { data: userEventEntries } = await admin
    .from('event_entries')
    .select('id, pool_id, total_points, is_active, submitted_at')
    .eq('user_id', user.id)

  interface EventPool {
    id: string
    name: string
    status: string
    tournamentId: string
    tournament: {
      name: string
      slug: string
      sport: string
      format: string
      status: string
    }
    entryCount: number
    userScore: number
    userRank: number | null
    isActive: boolean
    submittedAt: string | null
  }

  let eventPools: EventPool[] = []
  let liveGameCounts: Record<string, number> = {}
  if (userEventEntries?.length) {
    const poolIds = userEventEntries.map(e => e.pool_id)
    const { data: pools } = await admin
      .from('event_pools')
      .select('id, name, status, tournament_id, event_tournaments(name, slug, sport, format, status)')
      .in('id', poolIds)

    // Get unique member counts per pool (not entry counts)
    const { data: allEntries } = await admin
      .from('event_entries')
      .select('pool_id, user_id')
      .in('pool_id', poolIds)

    const poolUsers: Record<string, Set<string>> = {}
    for (const e of allEntries || []) {
      if (!poolUsers[e.pool_id]) poolUsers[e.pool_id] = new Set()
      if (e.user_id) poolUsers[e.pool_id].add(e.user_id)
    }
    const countMap: Record<string, number> = {}
    for (const [poolId, users] of Object.entries(poolUsers)) {
      countMap[poolId] = users.size
    }

    // Check for live games in each tournament
    const tournamentIds = [...new Set((pools || []).map(p => p.tournament_id))]
    if (tournamentIds.length > 0) {
      const { data: liveGames } = await admin
        .from('event_games')
        .select('tournament_id')
        .in('tournament_id', tournamentIds)
        .eq('status', 'live')
      for (const g of liveGames || []) {
        liveGameCounts[g.tournament_id] = (liveGameCounts[g.tournament_id] || 0) + 1
      }
    }

    eventPools = (pools || []).map(p => {
      const t = p.event_tournaments as unknown as { name: string; slug: string; sport: string; format: string; status: string }
      const entry = userEventEntries.find(e => e.pool_id === p.id)
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        tournamentId: p.tournament_id,
        tournament: t,
        entryCount: countMap[p.id] || 0,
        userScore: Number(entry?.total_points) || 0,
        userRank: null,
        isActive: entry?.is_active ?? true,
        submittedAt: entry?.submitted_at || null,
      }
    })
  }

  // Upcoming/active events for featured section
  const joinedTournamentIds = new Set(eventPools.map(p => p.tournamentId))
  // Show upcoming, active, and recently completed (within 3 days) tournaments
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const { data: allTournaments } = await admin
    .from('event_tournaments')
    .select('id, name, slug, sport, format, status, description, starts_at, ends_at, updated_at')
    .or(`status.in.(upcoming,active),and(status.eq.completed,updated_at.gte.${threeDaysAgo})`)
    .order('starts_at', { ascending: true })

  // Pool counts for featured tournaments
  let featuredPoolCounts: Record<string, number> = {}
  if ((allTournaments || []).length > 0) {
    const { data: featuredPools } = await admin
      .from('event_pools')
      .select('tournament_id')
      .in('tournament_id', (allTournaments || []).map(t => t.id))
    for (const p of featuredPools || []) {
      featuredPoolCounts[p.tournament_id] = (featuredPoolCounts[p.tournament_id] || 0) + 1
    }
  }

  // Sort: active first, then upcoming by date. Limit to 3.
  const featuredEvents = (allTournaments || [])
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    })
    .slice(0, 3)

  const referralUrl = `https://rivyls.com/welcome?ref=${user.id}`

  const statusStyles: Record<string, string> = {
    active: 'bg-success/20 text-success-text',
    upcoming: 'bg-brand/20 text-brand',
    completed: 'bg-surface-inset text-text-muted',
  }

  // --- Unified dashboard items ---
  const sportMeta: Record<string, { icon: string; label: string; borderColor: string }> = {
    college_football: { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500' },
    hockey: { icon: '\uD83C\uDFD2', label: 'Hockey', borderColor: 'border-l-blue-500' },
    golf: { icon: '\u26F3', label: 'Golf', borderColor: 'border-l-green-500' },
    rugby: { icon: '\uD83C\uDFC9', label: 'Rugby', borderColor: 'border-l-red-500' },
    football: { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500' },
    basketball: { icon: '\uD83C\uDFC0', label: 'Basketball', borderColor: 'border-l-amber-500' },
  }
  const defaultSportMeta = { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500' }
  const formatLabel: Record<string, string> = {
    bracket: 'Bracket', pickem: "Pick'em", survivor: 'Survivor', roster: 'Roster',
  }

  interface DashboardItem {
    type: 'league' | 'event'
    id: string
    name: string
    subtitle: string
    href: string
    sport: string
    icon: string
    borderColor: string
    format?: string
    rank: number | null
    totalMembers: number
    score: number | null
    needsAction: boolean
    isLive: boolean
    isDormant: boolean
    isCompleted: boolean
    badges: { label: string; variant: string }[]
  }

  // Convert leagues to dashboard items
  const leagueItems: DashboardItem[] = leagues.map(league => {
    const teamInfo = league.id ? userTeamMap[league.id] : undefined
    const sm = sportMeta[league.sports?.slug || ''] || defaultSportMeta
    return {
      type: 'league',
      id: league.id!,
      name: league.name || '',
      subtitle: league.seasons?.name || '',
      href: `/leagues/${league.id}`,
      sport: league.sports?.slug || 'other',
      icon: sm.icon,
      borderColor: sm.borderColor,
      rank: teamInfo?.rank ?? null,
      totalMembers: teamInfo?.totalTeams ?? 0,
      score: null,
      needsAction: false,
      isLive: false,
      isDormant: false,
      isCompleted: false,
      badges: [
        ...(currentWeek >= 0 ? [{ label: `Week ${currentWeek}`, variant: 'brand' }] : []),
        ...((league.role === 'commissioner' || league.role === 'co_commissioner')
          ? [{ label: league.role === 'co_commissioner' ? 'Co-Commish' : 'Commissioner', variant: 'warning' }]
          : []),
      ],
    }
  })

  // Convert event pools to dashboard items
  const eventItems: DashboardItem[] = eventPools
    .filter(p => p.tournament.status !== 'completed' && p.status !== 'completed')
    .map(pool => {
      const isLive = (liveGameCounts[pool.tournamentId] || 0) > 0
      const needsAction = !pool.submittedAt && pool.status === 'open'
      const sm = sportMeta[pool.tournament.sport] || defaultSportMeta
      return {
        type: 'event',
        id: pool.id,
        name: pool.name,
        subtitle: pool.tournament.name,
        href: `/events/${pool.tournament.slug}/pools/${pool.id}`,
        sport: pool.tournament.sport,
        icon: sm.icon,
        borderColor: sm.borderColor,
        format: formatLabel[pool.tournament.format] || pool.tournament.format,
        rank: pool.userRank,
        totalMembers: pool.entryCount,
        score: pool.userScore > 0 ? pool.userScore : null,
        needsAction,
        isLive,
        isDormant: false,
        isCompleted: false,
        badges: [
          ...(isLive ? [{ label: 'Live', variant: 'danger' }] : []),
          ...(needsAction ? [{ label: 'Picks needed', variant: 'brand' }] : []),
          ...(!pool.isActive && pool.tournament.format === 'survivor' ? [{ label: 'Eliminated', variant: 'danger' }] : []),
        ],
      }
    })

  // Completed event pools
  const completedEventItems: DashboardItem[] = eventPools
    .filter(p => p.tournament.status === 'completed' || p.status === 'completed')
    .map(pool => {
      const sm = sportMeta[pool.tournament.sport] || defaultSportMeta
      return {
      type: 'event' as const,
      id: pool.id,
      name: pool.name,
      subtitle: pool.tournament.name,
      href: `/events/${pool.tournament.slug}/pools/${pool.id}`,
      sport: pool.tournament.sport,
      icon: sm.icon,
      borderColor: sm.borderColor,
      format: formatLabel[pool.tournament.format] || pool.tournament.format,
      rank: pool.userRank,
      totalMembers: pool.entryCount,
      score: pool.userScore > 0 ? pool.userScore : null,
      needsAction: false,
      isLive: false,
      isDormant: false,
      isCompleted: true,
      badges: [],
    }
  })

  // Dormant league items
  const dormantItems: DashboardItem[] = dormantLeagues.map(league => {
    const sm = sportMeta[league.sports?.slug || ''] || defaultSportMeta
    return {
    type: 'league' as const,
    id: league.id!,
    name: league.name || '',
    subtitle: league.seasons?.name || '',
    href: `/leagues/${league.id}`,
    sport: league.sports?.slug || 'other',
    icon: sm.icon,
    borderColor: sm.borderColor,
    rank: null,
    totalMembers: 0,
    score: null,
    needsAction: false,
    isLive: false,
    isDormant: true,
    isCompleted: false,
    badges: [{ label: 'Dormant', variant: 'muted' }],
    }
  })

  // Sort active items: grouped by sport, then needsAction → isLive → alphabetical within each sport
  const activeItems = [...leagueItems, ...eventItems].sort((a, b) => {
    // Group by sport first
    if (a.sport !== b.sport) {
      // Sports with action-needed items come first
      const aSportPriority = a.needsAction ? 0 : a.isLive ? 1 : 2
      const bSportPriority = b.needsAction ? 0 : b.isLive ? 1 : 2
      if (aSportPriority !== bSportPriority) return aSportPriority - bSportPriority
      const labelA = (sportMeta[a.sport] || defaultSportMeta).label
      const labelB = (sportMeta[b.sport] || defaultSportMeta).label
      return labelA.localeCompare(labelB)
    }
    // Within same sport: needsAction → isLive → alphabetical
    if (a.needsAction !== b.needsAction) return a.needsAction ? -1 : 1
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const pastItems = [...dormantItems, ...completedEventItems]
  const hasAnyItems = activeItems.length > 0 || pastItems.length > 0

  function formatRank(rank: number): string {
    if (rank === 1) return '1st'
    if (rank === 2) return '2nd'
    if (rank === 3) return '3rd'
    return `${rank}th`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={user.email} userId={user.id} />

      {/* Error Banner */}
      {queryFailed && (
        <div className="container mx-auto px-4 pt-4">
          <div className="bg-surface border border-danger text-danger-text px-4 py-3 rounded-lg">
            Something went wrong loading your data. Try refreshing the page. If the problem persists, check your internet connection.
          </div>
        </div>
      )}

      {/* Fan Zone */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <FanZoneWidget
            userSchool={userSchool}
            fanDistribution={fanDistribution}
            totalFans={totalFans}
            rivalSchool={rivalSchool}
            referralUrl={referralUrl}
            displayName={profile?.display_name || 'A friend'}
            userId={user.id}
          />
        </div>
      </section>

      {/* Locker Room */}
      <section className="bg-surface py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-text-primary">Locker Room</h1>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/leagues/join"
                className="bg-surface-subtle hover:bg-surface-inset text-text-primary font-semibold py-2 px-4 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md text-sm"
              >
                Join Competition
              </Link>
              <Link
                href="/leagues/create"
                className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Create Competition
              </Link>
              <Link
                href="/events"
                className="bg-surface-subtle hover:bg-surface-inset text-text-primary font-semibold py-2 px-4 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md text-sm"
              >
                Browse Competitions &rarr;
              </Link>
            </div>
          </div>

          {!hasAnyItems ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">{'\uD83C\uDFC6'}</div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                No competitions yet
              </h2>
              <p className="text-text-secondary mb-6">
                Create or join a league, or browse prediction events to get started.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/leagues/join"
                  className="bg-surface-subtle hover:bg-surface-inset text-text-primary font-semibold py-2 px-6 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md"
                >
                  Join with Code
                </Link>
                <Link
                  href="/leagues/create"
                  className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Create Competition
                </Link>
                <Link
                  href="/events"
                  className="bg-surface-subtle hover:bg-surface-inset text-text-primary font-semibold py-2 px-6 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md"
                >
                  Browse Competitions
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className={`bg-surface-subtle rounded-lg p-5 hover:bg-surface-inset transition-all border border-border hover:border-brand/40 hover:shadow-md border-l-4 overflow-hidden min-w-0 ${item.borderColor}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="text-2xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-text-primary truncate">{item.name}</h3>
                        <p className="text-text-muted text-sm truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.badges.map((badge, i) => (
                        <span
                          key={i}
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            badge.variant === 'brand' ? 'bg-brand/20 text-brand-text' :
                            badge.variant === 'warning' ? 'bg-warning/20 text-warning-text' :
                            badge.variant === 'danger'
                              ? (badge.label === 'Live'
                                ? 'inline-flex items-center gap-1 bg-danger/20 text-danger-text'
                                : 'bg-danger/20 text-danger-text')
                              : 'bg-surface-inset text-text-muted'
                          }`}
                        >
                          {badge.label === 'Live' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse inline-block mr-1" />
                          )}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3 ml-9">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.type === 'league'
                        ? 'bg-brand/15 text-brand-text'
                        : 'bg-accent/15 text-accent-text'
                    }`}>
                      {item.type === 'league' ? 'League' : item.format || 'Event'}
                    </span>
                  </div>
                  <div className="space-y-1 text-text-secondary text-sm ml-9">
                    {item.rank && item.totalMembers > 1 && (
                      <p className="flex items-center gap-2">
                        <span>{'\uD83C\uDFC6'}</span>
                        <span>{formatRank(item.rank)} of {item.totalMembers}</span>
                      </p>
                    )}
                    {!item.rank && item.totalMembers > 0 && (
                      <p className="flex items-center gap-2">
                        <span>{'\uD83D\uDC65'}</span>
                        <span>{item.totalMembers} member{item.totalMembers !== 1 ? 's' : ''}</span>
                      </p>
                    )}
                    {item.score !== null && (
                      <p className="flex items-center gap-2">
                        <span>{'\u2B50'}</span>
                        <span>{item.score} pts</span>
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <section className="bg-tertiary py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-inverse">Featured Events</h2>
              {(allTournaments || []).length > 3 && (
                <Link href="/events" className="text-sm text-text-inverse/80 hover:text-text-inverse transition-colors">
                  Browse all &rarr;
                </Link>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredEvents.map((tournament) => {
                const meta = sportMeta[tournament.sport] || defaultSportMeta
                const startsAt = new Date(tournament.starts_at)
                const now = new Date()
                const daysUntil = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const pools = featuredPoolCounts[tournament.id] || 0
                const isJoined = joinedTournamentIds.has(tournament.id)
                return (
                  <Link
                    key={tournament.id}
                    href={`/events/${tournament.slug}`}
                    className={`bg-card-neutral rounded-lg hover:shadow-lg transition-all group border-l-4 overflow-hidden min-w-0 ${meta.borderColor}`}
                  >
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="text-2xl shrink-0">{meta.icon}</span>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-card-text group-hover:text-brand transition-colors truncate">
                              {tournament.name}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[tournament.status] || ''}`}>
                            {tournament.status === 'upcoming' && daysUntil > 0
                              ? `Starts in ${daysUntil}d`
                              : tournament.status === 'active'
                              ? 'Live'
                              : tournament.status}
                          </span>
                          {isJoined && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/20 text-success-text">
                              Joined
                            </span>
                          )}
                        </div>
                      </div>
                      {tournament.description && (
                        <p className="text-card-text-muted text-sm font-medium line-clamp-2 ml-9">{tournament.description}</p>
                      )}
                    </div>
                    <div className="px-5 py-3 border-t border-card-text/10 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-card-text-muted font-medium">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand/15 text-brand">
                          {formatLabel[tournament.format] || tournament.format}
                        </span>
                        <span>{pools} pool{pools !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-card-text-muted text-xs font-medium">
                        {startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {tournament.ends_at && (
                          <> &ndash; {new Date(tournament.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                        )}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Past & Completed */}
      {pastItems.length > 0 && (
        <section className="bg-surface py-8">
          <div className="container mx-auto px-4">
            <details>
              <summary className="cursor-pointer select-none text-text-secondary hover:text-text-primary transition-colors">
                <span className="text-lg font-semibold">Past &amp; Completed ({pastItems.length})</span>
              </summary>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {pastItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="bg-surface/60 rounded-lg p-5 hover:bg-surface-subtle transition-all border border-border/50 opacity-75 hover:opacity-100 overflow-hidden min-w-0"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-text-secondary truncate">
                        {item.name}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        item.type === 'league'
                          ? 'bg-brand/15 text-brand-text'
                          : 'bg-accent/15 text-accent-text'
                      }`}>
                        {item.type === 'league' ? 'League' : item.format || 'Event'}
                      </span>
                    </div>
                    <div className="space-y-1 text-text-muted text-sm">
                      <p>{item.subtitle}</p>
                      {item.score !== null && <p>{'\u2B50'} {item.score} pts</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </section>
      )}
    </div>
  )
}
