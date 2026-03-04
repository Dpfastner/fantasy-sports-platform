import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import DraftStatusSection from '@/components/DraftStatusSection'
import LeaderboardClient from '@/components/LeaderboardClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ReportContentButton } from '@/components/ReportContentButton'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { ShareButton } from '@/components/ShareButton'
import { getCurrentWeek } from '@/lib/week'
import { getEnvironment } from '@/lib/env'
import { getLeagueYear } from '@/lib/league-helpers'
import { buildShareUrl } from '@/lib/share'
import { SITE_URL } from '@/lib/og/constants'

// Force dynamic rendering to ensure fresh data from database
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('leagues').select('name').eq('id', id).single()
  const name = data?.name || 'League'

  return {
    title: `${name} — Rivyls`,
    openGraph: {
      title: `${name} Standings — Rivyls`,
      description: 'Check out the latest standings in our Rivyls fantasy college football league!',
      images: [`${SITE_URL}/api/og/leaderboard?leagueId=${id}`],
      url: `${SITE_URL}/leagues/${id}`,
      siteName: 'Rivyls',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} Standings — Rivyls`,
      description: 'Check out the latest standings in our Rivyls fantasy college football league!',
    },
  }
}

interface LeagueData {
  id: string
  name: string
  description: string | null
  invite_code: string
  is_public: boolean
  max_teams: number
  season_id: string
  sports: { name: string; slug: string } | null
  seasons: { name: string; year: number } | null
  league_settings: {
    draft_date: string | null
    draft_type: string
    schools_per_team: number
    max_add_drops_per_season: number
    max_school_selections_total: number
    entry_fee: number
    prize_pool: number
    high_points_enabled: boolean
    high_points_weekly_amount: number
    double_points_enabled: boolean
    max_double_picks_per_season: number
  } | null
  drafts: {
    status: string
  }[] | { status: string } | null
}

interface TeamData {
  id: string
  name: string
  user_id: string
  total_points: number
  high_points_winnings: number
  add_drops_used: number
  primary_color: string
  secondary_color: string
  image_url: string | null
  profiles: { display_name: string | null; email: string } | null
}

interface WeeklyPoints {
  fantasy_team_id: string
  week_number: number
  points: number
  is_high_points_winner: boolean
  high_points_amount: number
}

export default async function LeaguePage({ params }: PageProps) {
  const { id } = await params
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

  // Get league details
  const { data: leagueData, error: leagueError } = await supabase
    .from('leagues')
    .select(`
      *,
      sports (name, slug),
      seasons (name, year),
      league_settings (*),
      drafts (*)
    `)
    .eq('id', id)
    .single()

  if (leagueError || !leagueData) {
    notFound()
  }

  const league = leagueData as unknown as LeagueData

  // Check if user is a member
  const { data: membershipData } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  const membership = membershipData as { role: string } | null

  if (!membership && !league.is_public) {
    notFound()
  }

  const isCommissioner = membership?.role === 'commissioner'

  // Get all members count
  const { count: memberCount } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', id)

  // Get all teams in the league
  const { data: teamsData, error: teamsError } = await supabase
    .from('fantasy_teams')
    .select(`
      id, name, user_id, total_points, high_points_winnings, add_drops_used,
      primary_color, secondary_color, image_url,
      profiles!fantasy_teams_user_id_fkey(display_name, email)
    `)
    .eq('league_id', id)
    .order('total_points', { ascending: false })

  if (teamsError) {
    console.error('Failed to fetch teams:', teamsError.message)
  }

  const teams = teamsData as unknown as TeamData[] | null

  // Get user's team
  const userTeam = teams?.find(t => t.user_id === user.id)

  const settings = league.league_settings
  const draft = Array.isArray(league.drafts) ? league.drafts[0] : league.drafts
  const isDraftComplete = draft?.status === 'completed'

  // Calculate current week (with sandbox override support)
  const year = getLeagueYear(league.seasons)
  const currentWeek = await getCurrentWeek(year)
  const environment = getEnvironment()

  // Get weekly points for leaderboard (only if draft complete, filter by simulated week)
  let weeklyPoints: WeeklyPoints[] = []
  if (isDraftComplete && teams && teams.length > 0) {
    const teamIds = teams.map(t => t.id)
    const { data: weeklyPointsData } = await supabase
      .from('fantasy_team_weekly_points')
      .select('*')
      .in('fantasy_team_id', teamIds)
      .lte('week_number', currentWeek)
      .order('week_number', { ascending: true })
    weeklyPoints = (weeklyPointsData || []) as WeeklyPoints[]
  }

  // Get announcements for league activity section
  const { data: announcementsData } = await supabase
    .from('league_announcements')
    .select('id, title, body, pinned, created_at, commissioner_id')
    .eq('league_id', id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  // Build commissioner name map from teams data
  const commissionerNames = new Map<string, string>()
  if (teams) {
    for (const team of teams) {
      const profile = team.profiles as { display_name: string | null; email: string } | null
      commissionerNames.set(team.user_id, profile?.display_name || profile?.email?.split('@')[0] || 'Commissioner')
    }
  }

  const announcements = announcementsData || []

  // Get double picks count for user's team
  let doublePicksUsed = 0
  if (userTeam && settings?.double_points_enabled) {
    const { count } = await supabase
      .from('weekly_double_picks')
      .select('*', { count: 'exact', head: true })
      .eq('fantasy_team_id', userTeam.id)
    doublePicksUsed = count || 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={user.email}>
        {isDraftComplete && userTeam && (
          <Link
            href={`/leagues/${id}/team`}
            className="text-brand-text hover:text-brand-text transition-colors font-medium"
          >
            My Roster
          </Link>
        )}
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-6">
        {/* League Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{league.name}</h1>
              {isCommissioner && (
                <span className="bg-warning/20 text-warning-text text-xs px-2 py-1 rounded">
                  Commissioner
                </span>
              )}
            </div>
            <p className="text-text-secondary text-sm">
              {league.sports?.name} &bull; {league.seasons?.name} &bull; Week {currentWeek}
            </p>
          </div>

          {/* Commissioner Tools */}
          {isCommissioner && (
            <Link
              href={`/leagues/${id}/settings`}
              className="bg-surface hover:bg-surface-subtle text-text-primary text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Commissioner Tools
            </Link>
          )}
        </div>

        {/* Quick Navigation Bar */}
        {isDraftComplete && (
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border">
            <Link
              href={`/leagues/${id}/schedule`}
              className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
            >
              Schedule
            </Link>
            <Link
              href={`/leagues/${id}/transactions`}
              className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
            >
              Add/Drop
            </Link>
            <Link
              href={`/leagues/${id}/stats`}
              className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
            >
              League Stats
            </Link>
          </div>
        )}

        {/* Invite Code (Commissioner only) */}
        {isCommissioner && (
          <div className="bg-highlight-row border border-brand rounded-lg p-3 mb-6 flex items-center gap-3">
            <span className="text-brand-text text-sm">Invite Code:</span>
            <code className="text-lg font-mono text-text-primary tracking-wider">
              {league.invite_code}
            </code>
            <div className="ml-auto">
              <ShareButton
                shareData={{
                  title: `Join ${league.name} on Rivyls!`,
                  text: `Join my fantasy college football league "${league.name}" on Rivyls! Use invite code: ${league.invite_code}`,
                  url: buildShareUrl('/leagues/join', { source: 'invite', campaign: league.name }),
                }}
                ogImageUrl={`/api/og/invite?leagueId=${id}`}
                label="Share Invite"
              />
            </div>
          </div>
        )}

        {/* Main Grid - Wider leaderboard, narrower sidebar */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Draft Status (only when NOT completed) */}
            {!isDraftComplete && (
              <DraftStatusSection
                leagueId={id}
                initialStatus={draft?.status || 'not_started'}
                isCommissioner={isCommissioner}
                teamCount={teams?.length || 0}
                memberCount={memberCount || 0}
                draftDate={settings?.draft_date || null}
              />
            )}

            {/* Leaderboard (only when draft IS completed) */}
            {isDraftComplete && teams && teams.length > 0 && (
              <div className="bg-surface rounded-lg p-4 md:p-6">
                <div className="flex items-center justify-end gap-2 mb-4">
                  <ShareButton
                    shareData={{
                      title: `${league.name} Standings — Rivyls`,
                      text: `Check out the standings in ${league.name}!`,
                      url: buildShareUrl(`/leagues/${id}`, { source: 'leaderboard' }),
                    }}
                    ogImageUrl={`/api/og/leaderboard?leagueId=${id}`}
                    label="Share Standings"
                  />
                  {currentWeek > 0 && (
                    <ShareButton
                      shareData={{
                        title: `${league.name} — Week ${currentWeek} Recap`,
                        text: `Week ${currentWeek} recap for ${league.name} on Rivyls!`,
                        url: buildShareUrl(`/leagues/${id}`, { source: 'recap', campaign: `week-${currentWeek}` }),
                      }}
                      ogImageUrl={`/api/og/recap?leagueId=${id}&week=${currentWeek}`}
                      label="Share Recap"
                    />
                  )}
                </div>
                <ErrorBoundary sectionName="leaderboard">
                  <LeaderboardClient
                    leagueId={id}
                    variant="embedded"
                    currentWeek={currentWeek}
                    currentUserId={user.id}
                    initialTeams={teams}
                    initialWeeklyPoints={weeklyPoints}
                    settings={settings ? {
                      high_points_enabled: settings.high_points_enabled || false,
                      high_points_weekly_amount: settings.high_points_weekly_amount || 0,
                    } : null}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* League Activity — Announcements (always visible) */}
            <ErrorBoundary sectionName="announcements">
              <div className="bg-surface rounded-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-text-primary">League Activity</h2>
                  {isCommissioner && (
                    <Link
                      href={`/leagues/${id}/settings?tab=misc`}
                      className="text-brand-text hover:text-brand-text/80 text-xs transition-colors"
                    >
                      Manage Announcements
                    </Link>
                  )}
                </div>
                <div className="space-y-3">
                  {announcements.length > 0 ? (
                    announcements.map(a => {
                      const commName = commissionerNames.get(a.commissioner_id) || 'Commissioner'
                      const daysAgo = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24))
                      const timeAgo = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

                      return (
                        <div key={a.id} className="p-3 bg-surface-inset rounded-lg border border-border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {a.pinned && (
                                  <svg className="w-3.5 h-3.5 text-warning shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                                  </svg>
                                )}
                                <h3 className="text-sm font-semibold text-text-primary truncate">{a.title}</h3>
                              </div>
                              <p className="text-text-secondary text-sm whitespace-pre-wrap">{a.body}</p>
                              <p className="text-text-muted text-xs mt-2">
                                — {commName}, {timeAgo}
                              </p>
                            </div>
                            <ReportContentButton
                              contentType="announcement"
                              contentId={a.id}
                              contentPreview={`${a.title}: ${a.body}`}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-3 bg-surface-inset rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-text-primary">Welcome to {league.name}!</h3>
                      </div>
                      <p className="text-text-secondary text-sm">
                        {isCommissioner
                          ? 'Post announcements here to keep your league members informed. Head to Commissioner Tools \u2192 Miscellaneous to create your first announcement.'
                          : 'League announcements from your commissioner will appear here. Stay tuned!'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ErrorBoundary>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4">
            {/* Your Team Summary - Compact */}
            {userTeam && (
              <div className="bg-surface rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Your Team</h2>
                  {isDraftComplete && (
                    <Link
                      href={`/leagues/${id}/team`}
                      className="text-brand-text hover:text-brand-text text-xs"
                    >
                      View Roster →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  {userTeam.image_url ? (
                    <img src={userTeam.image_url} alt={userTeam.name} className="w-8 h-8 object-contain rounded" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: userTeam.primary_color || '#374151',
                        color: userTeam.secondary_color || '#ffffff',
                      }}
                    >
                      {userTeam.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-text-primary font-medium text-sm">{userTeam.name}</p>
                    <p className="text-text-muted text-xs">
                      Rank #{(teams?.findIndex(t => t.id === userTeam.id) || 0) + 1} of {teams?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-surface-inset rounded p-2">
                    <p className="text-lg font-bold text-text-primary">{userTeam.total_points}</p>
                    <p className="text-text-secondary text-[10px] uppercase">Points</p>
                  </div>
                  <div className="bg-surface-inset rounded p-2">
                    <p className="text-lg font-bold text-text-primary">{userTeam.add_drops_used}/{settings?.max_add_drops_per_season || 50}</p>
                    <p className="text-text-secondary text-[10px] uppercase">Add/Drops</p>
                  </div>
                  {settings?.double_points_enabled && (
                    <div className="bg-surface-inset rounded p-2">
                      <p className="text-lg font-bold text-info-text">
                        {doublePicksUsed}/{settings.max_double_picks_per_season > 0 ? settings.max_double_picks_per_season : '∞'}
                      </p>
                      <p className="text-text-secondary text-[10px] uppercase">2x Picks</p>
                    </div>
                  )}
                  {settings?.high_points_enabled && (
                    <div className="bg-surface-inset rounded p-2">
                      <p className="text-lg font-bold text-warning-text">
                        ${userTeam.high_points_winnings || 0}
                      </p>
                      <p className="text-text-secondary text-[10px] uppercase">HP Won</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* League Info - Compact */}
            <div className="bg-surface rounded-lg p-4">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">League Info</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Teams</span>
                  <span className="text-text-primary">{teams?.length || 0} / {league.max_teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Schools per Team</span>
                  <span className="text-text-primary">{settings?.schools_per_team || 12}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">School Limit (League)</span>
                  <span className="text-text-primary">{settings?.max_school_selections_total || 3}x max</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Draft Type</span>
                  <span className="text-text-primary capitalize">{settings?.draft_type || 'Snake'}</span>
                </div>
                {settings?.entry_fee && settings.entry_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Entry Fee</span>
                    <span className="text-text-primary">${settings.entry_fee}</span>
                  </div>
                )}
                {settings?.prize_pool && settings.prize_pool > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Prize Pool</span>
                    <span className="text-success-text font-medium">${settings.prize_pool}</span>
                  </div>
                )}
                {settings?.high_points_enabled && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">High Points</span>
                    <span className="text-warning-text">${settings.high_points_weekly_amount}/wk</span>
                  </div>
                )}
                {settings?.double_points_enabled && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Double Points</span>
                    <span className="text-info-text">Enabled</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-surface rounded-lg p-4">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Key Dates</h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-warning rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-text-primary font-medium">Heisman Trophy</p>
                    <p className="text-text-secondary">Dec 14, {year}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-accent rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-text-primary font-medium">College Football Playoffs</p>
                    <p className="text-text-secondary">Dec 20, {year} - Jan 10, {year + 1}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-danger rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-text-primary font-medium">National Championship</p>
                    <p className="text-text-secondary">Jan 20, {year + 1}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </div>
  )
}
