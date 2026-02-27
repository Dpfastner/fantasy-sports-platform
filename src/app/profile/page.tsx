import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserBadges } from '@/components/UserBadges'
import { CopyButton } from '@/components/CopyButton'
import { getUserBadges } from '@/lib/badges'
import type { UserTier } from '@/types/database'

interface LeagueRow {
  league_id: string
  role: 'commissioner' | 'co_commissioner' | 'member'
  leagues: {
    id: string
    name: string
    max_teams: number
  }
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [profileResult, leaguesResult, badges] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, email, tier, referred_by, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('league_members')
      .select('league_id, role, leagues(id, name, max_teams)')
      .eq('user_id', user.id),
    getUserBadges(user.id),
  ])

  const profile = profileResult.data
  if (!profile) {
    redirect('/login')
  }

  const leagues = (leaguesResult.data || []) as unknown as LeagueRow[]
  const commissionerLeagues = leagues.filter(l => l.role === 'commissioner' || l.role === 'co_commissioner')
  const memberLeagues = leagues.filter(l => l.role === 'member')

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const referralUrl = `https://rivyls.com/welcome?ref=${user.id}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
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
          <div className="flex items-start justify-between">
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
            <Link
              href="/settings"
              className="px-4 py-2 bg-surface-subtle hover:bg-surface-inset text-text-secondary hover:text-text-primary rounded-lg transition-colors text-sm"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* My Leagues */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">My Leagues</h2>

          {leagues.length === 0 ? (
            <p className="text-text-secondary">
              You haven&apos;t joined any leagues yet.{' '}
              <Link href="/leagues/create" className="text-brand hover:text-brand-hover">
                Create one
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
            </div>
          )}
        </div>

        {/* Referral Link */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Invite Friends</h2>
          <p className="text-text-secondary text-sm mb-4">
            Share your referral link to invite friends to Rivyls.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="flex-1 px-4 py-2 bg-surface-subtle border border-border rounded-lg text-text-secondary text-sm font-mono"
            />
            <CopyButton text={referralUrl} />
          </div>
        </div>
      </main>
    </div>
  )
}
