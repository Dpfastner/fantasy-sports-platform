import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserBadges } from '@/components/UserBadges'
import { TrophyCase } from '@/components/TrophyCase'
import { CopyButton } from '@/components/CopyButton'
import { ShareButton } from '@/components/ShareButton'
import { buildShareUrl } from '@/lib/share'
import { SITE_URL } from '@/lib/og/constants'
import { getUserBadges } from '@/lib/badges'
import { ProfileBannerCollection } from '@/components/ProfileBannerCollection'
import { BadgeCelebration } from '@/components/BadgeCelebration'
import type { UserTier } from '@/types/database'

interface LeagueRow {
  league_id: string
  role: 'commissioner' | 'co_commissioner' | 'member'
  leagues: {
    id: string
    name: string
    status: string | null
    max_teams: number
  }
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [profileResult, leaguesResult, poolsResult, badges] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, email, tier, referred_by, created_at, favorite_school_id, featured_favorite_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('league_members')
      .select('league_id, role, leagues(id, name, status, max_teams)')
      .eq('user_id', user.id),
    supabase
      .from('event_entries')
      .select('pool_id, event_pools(id, name, status, created_by, event_tournaments(slug, name, sport))')
      .eq('user_id', user.id),
    getUserBadges(user.id),
  ])

  const profile = profileResult.data
  if (!profile) {
    redirect('/login')
  }

  // Fetch all sport favorites for this user
  const { data: sportFavorites } = await supabase
    .from('user_sport_favorites')
    .select('id, banner_color_scheme, sport_id, school_id, schools(id, name, logo_url, primary_color, secondary_color), sports(name)')
    .eq('user_id', user.id)
    .order('created_at')

  interface SportFavoriteRow {
    id: string
    banner_color_scheme: string
    sport_id: string
    school_id: string
    schools: { id: string; name: string; logo_url: string | null; primary_color: string; secondary_color: string } | null
    sports: { name: string } | null
  }

  const favorites = ((sportFavorites || []) as unknown as SportFavoriteRow[])
    .filter(sf => sf.schools)
    .map(sf => ({
      id: sf.id,
      sportName: sf.sports?.name || 'Unknown',
      school: sf.schools!,
      bannerColorScheme: (sf.banner_color_scheme || 'primary') as 'primary' | 'alternate',
    }))

  const allLeagues = (leaguesResult.data || []) as unknown as LeagueRow[]
  const leagues = allLeagues.filter(l => l.leagues.status !== 'dormant')
  const dormantLeagues = allLeagues.filter(l => l.leagues.status === 'dormant')
  const commissionerLeagues = leagues.filter(l => l.role === 'commissioner' || l.role === 'co_commissioner')
  const memberLeagues = leagues.filter(l => l.role === 'member')

  // Deduplicate pools by pool_id (user may have multiple entries)
  interface PoolEntry {
    poolId: string
    poolName: string
    poolStatus: string
    isCreator: boolean
    tournamentSlug: string
    tournamentName: string
    sport: string
  }
  const seenPoolIds = new Set<string>()
  const userPools: PoolEntry[] = []
  for (const entry of (poolsResult.data || []) as { pool_id: string; event_pools: { id: string; name: string; status: string; created_by: string; event_tournaments: { slug: string; name: string; sport: string } | { slug: string; name: string; sport: string }[] | null } | { id: string; name: string; status: string; created_by: string; event_tournaments: { slug: string; name: string; sport: string } | { slug: string; name: string; sport: string }[] | null }[] | null }[]) {
    if (seenPoolIds.has(entry.pool_id)) continue
    seenPoolIds.add(entry.pool_id)
    const pool = Array.isArray(entry.event_pools) ? entry.event_pools[0] : entry.event_pools
    if (!pool) continue
    const tournament = Array.isArray(pool.event_tournaments) ? pool.event_tournaments[0] : pool.event_tournaments
    userPools.push({
      poolId: pool.id,
      poolName: pool.name,
      poolStatus: pool.status,
      isCreator: pool.created_by === user.id,
      tournamentSlug: tournament?.slug || '',
      tournamentName: tournament?.name || '',
      sport: tournament?.sport || '',
    })
  }
  const activePools = userPools.filter(p => p.poolStatus !== 'completed')
  const completedPools = userPools.filter(p => p.poolStatus === 'completed')

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const referralUrl = `https://rivyls.com/welcome?ref=${user.id}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <BadgeCelebration />
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-text-secondary hover:text-text-primary transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
            &larr; Dashboard
          </Link>
        </div>

        {/* Profile Header */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-text-primary">
                  {profile.display_name || 'Unknown User'}
                </h1>
                <UserBadges badges={badges} tier={profile.tier as UserTier} />
              </div>
              <p className="text-text-secondary">{profile.email}</p>
              <p className="text-text-muted text-sm mt-1">Member since {joinDate}</p>
            </div>
            <div className="flex items-start gap-3">
              {favorites.length > 0 && (
                <ProfileBannerCollection
                  favorites={favorites}
                  featuredId={profile.featured_favorite_id}
                  userId={user.id}
                />
              )}
              <Link
                href="/settings"
                className="px-4 py-2 bg-surface-subtle hover:bg-surface-inset text-text-secondary hover:text-text-primary rounded-lg transition-colors text-sm shrink-0"
              >
                Edit Profile
              </Link>
            </div>
          </div>
          {favorites.length === 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href="/leagues/join"
                className="text-brand-text hover:text-brand-text/80 text-sm"
              >
                Join a league to collect your first team banner &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Trophy Case */}
        {badges.length > 0 && (
          <div className="bg-surface rounded-lg p-6 mb-6">
            <TrophyCase
              badges={badges}
              displayName={profile.display_name || 'You'}
            />
          </div>
        )}

        {/* My Competitions */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">My Competitions</h2>

          {allLeagues.length === 0 && userPools.length === 0 ? (
            <p className="text-text-secondary">
              You haven&apos;t joined any competitions yet.{' '}
              <Link href="/leagues/create" className="text-brand hover:text-brand-hover">
                Create a league
              </Link>{' '}
              or{' '}
              <Link href="/leagues/join" className="text-brand hover:text-brand-hover">
                join with an invite code
              </Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {commissionerLeagues.length > 0 && (
                <div>
                  <h3 className="text-text-muted text-sm font-medium mb-2 uppercase tracking-wider">
                    Commissioner
                  </h3>
                  {commissionerLeagues.map((l) => (
                    <Link
                      key={l.league_id}
                      href={`/leagues/${l.league_id}`}
                      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-surface-subtle transition-colors"
                    >
                      <div>
                        <span className="text-text-primary font-medium">{l.leagues.name}</span>
                        <span className="text-text-muted text-sm ml-2">
                          {l.role === 'co_commissioner' ? '(Co-Commissioner)' : ''}
                        </span>
                      </div>
                      <span className="text-text-muted text-sm">{l.leagues.max_teams} teams</span>
                    </Link>
                  ))}
                </div>
              )}

              {memberLeagues.length > 0 && (
                <div>
                  <h3 className="text-text-muted text-sm font-medium mb-2 uppercase tracking-wider">
                    Member
                  </h3>
                  {memberLeagues.map((l) => (
                    <Link
                      key={l.league_id}
                      href={`/leagues/${l.league_id}`}
                      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-surface-subtle transition-colors"
                    >
                      <span className="text-text-primary font-medium">{l.leagues.name}</span>
                      <span className="text-text-muted text-sm">{l.leagues.max_teams} teams</span>
                    </Link>
                  ))}
                </div>
              )}

              {activePools.length > 0 && (
                <div>
                  <h3 className="text-text-muted text-sm font-medium mb-2 uppercase tracking-wider">
                    Event Pools
                  </h3>
                  {activePools.map((p) => (
                    <Link
                      key={p.poolId}
                      href={`/events/${p.tournamentSlug}/pools/${p.poolId}`}
                      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-surface-subtle transition-colors"
                    >
                      <div>
                        <span className="text-text-primary font-medium">{p.poolName}</span>
                        {p.isCreator && <span className="text-text-muted text-xs ml-2">(Creator)</span>}
                      </div>
                      <span className="text-text-muted text-sm">{p.tournamentName}</span>
                    </Link>
                  ))}
                </div>
              )}

              {(dormantLeagues.length > 0 || completedPools.length > 0) && (
                <div className="pt-3 mt-3 border-t border-border">
                  <h3 className="text-text-muted text-sm font-medium mb-2 uppercase tracking-wider">
                    Past Competitions
                  </h3>
                  {dormantLeagues.map((l) => (
                    <Link
                      key={l.league_id}
                      href={`/leagues/${l.league_id}`}
                      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-surface-subtle transition-colors opacity-75 hover:opacity-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary font-medium">{l.leagues.name}</span>
                        <span className="bg-surface-inset text-text-muted text-xs px-1.5 py-0.5 rounded">Dormant</span>
                      </div>
                      <span className="text-text-muted text-sm">{l.leagues.max_teams} teams</span>
                    </Link>
                  ))}
                  {completedPools.map((p) => (
                    <Link
                      key={p.poolId}
                      href={`/events/${p.tournamentSlug}/pools/${p.poolId}`}
                      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-surface-subtle transition-colors opacity-75 hover:opacity-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary font-medium">{p.poolName}</span>
                        <span className="bg-surface-inset text-text-muted text-xs px-1.5 py-0.5 rounded">Completed</span>
                      </div>
                      <span className="text-text-muted text-sm">{p.tournamentName}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Referral Link */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Invite Friends</h2>
          <p className="text-text-secondary text-sm mb-4">
            Share your referral link to invite friends to Rivyls. Referrals help you earn badges and unlock future rewards.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="flex-1 min-w-0 px-4 py-2 bg-surface-subtle border border-border rounded-lg text-text-secondary text-sm font-mono truncate"
            />
            <CopyButton text={referralUrl} />
            <ShareButton
              shareData={{
                title: 'Join Rivyls — Fantasy College Sports',
                text: `${profile.display_name || 'A friend'} wants you to start a league on Rivyls!`,
                url: buildShareUrl(`/welcome?ref=${user.id}`, { source: 'referral' }),
              }}
              ogImageUrl={`${SITE_URL}/api/og/referral?userId=${user.id}`}
              label="Share"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
