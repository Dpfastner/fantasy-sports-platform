import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
      seasons: { year: number; name: string } | null
      sports: { name: string; slug: string } | null
    } | null
  }

  const leagues = (leagueMemberships as LeagueMembership[] | null)?.map(m => ({
    ...m.leagues,
    role: m.role
  })).filter(l => l.id) || []

  // Get user's teams for rank info
  const leagueIds = leagues.map(l => l.id)
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
  let userSchool: { name: string; logo_url: string | null; primary_color: string; secondary_color: string } | null = null
  let fanDistribution: { schoolName: string; count: number; color: string; logoUrl: string | null }[] = []
  let totalFans = 0
  let rivalSchool: { name: string; count: number } | null = null

  if (profile?.favorite_school_id) {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name, logo_url, primary_color, secondary_color')
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

  const referralUrl = `https://rivyls.com/welcome?ref=${user.id}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={user.email} userId={user.id} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {queryFailed && (
          <div className="bg-danger/10 border border-danger text-danger-text px-4 py-3 rounded-lg mb-6">
            Something went wrong loading your data. Try refreshing the page. If the problem persists, check your internet connection.
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">My Leagues</h1>
          <div className="flex gap-4">
            <Link
              href="/leagues/join"
              className="bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-2 px-4 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md"
            >
              Join League
            </Link>
            <Link
              href="/leagues/create"
              className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Create League
            </Link>
          </div>
        </div>

        {leagues.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">🏈</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              No leagues yet
            </h2>
            <p className="text-text-secondary mb-6">
              Create a new league to become a commissioner, or join an existing league with an invite code.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/leagues/join"
                className="bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-2 px-6 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md"
              >
                Join with Code
              </Link>
              <Link
                href="/leagues/create"
                className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Create League
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="bg-surface rounded-lg p-6 hover:bg-surface-subtle transition-all border border-border hover:border-brand/40 hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-text-primary">
                    {league.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {currentWeek >= 0 && (
                      <span className="bg-brand/20 text-brand-text text-xs px-2 py-1 rounded font-medium">
                        Week {currentWeek}
                      </span>
                    )}
                    {(league.role === 'commissioner' || league.role === 'co_commissioner') && (
                      <span className="bg-warning/20 text-warning-text text-xs px-2 py-1 rounded">
                        {league.role === 'co_commissioner' ? 'Co-Commish' : 'Commissioner'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-text-secondary">
                  <p className="flex items-center gap-2">
                    <span>🏈</span>
                    <span>{league.sports?.name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{league.seasons?.name}</span>
                  </p>
                  {league.id && userTeamMap[league.id] && userTeamMap[league.id].totalTeams > 1 && (
                    <p className="flex items-center gap-2">
                      <span>🏆</span>
                      <span>
                        {userTeamMap[league.id].rank === 1
                          ? '1st'
                          : userTeamMap[league.id].rank === 2
                          ? '2nd'
                          : userTeamMap[league.id].rank === 3
                          ? '3rd'
                          : `${userTeamMap[league.id].rank}th`
                        } of {userTeamMap[league.id].totalTeams}
                      </span>
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Fan Zone Widget */}
        <div className="mt-8">
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
      </main>
    </div>
  )
}
