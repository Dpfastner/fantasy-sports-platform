import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserBadges } from '@/lib/badges'
import { TrophyCase } from '@/components/TrophyCase'
import { Pennant } from '@/components/Pennant'
import { Header } from '@/components/Header'
import { BlockUserButton } from '@/components/BlockUserButton'
import { SITE_URL } from '@/lib/og/constants'
import { BadgeCelebration } from '@/components/BadgeCelebration'

interface PageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  const name = data?.display_name || 'Rivyls Player'
  return {
    title: `${name} — Rivyls`,
    openGraph: {
      title: `${name}'s Trophy Case — Rivyls`,
      description: `Check out ${name}'s badges and achievements on Rivyls Fantasy Sports.`,
      url: `${SITE_URL}/profile/${userId}`,
      siteName: 'Rivyls',
    },
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { userId } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, tier, created_at, favorite_school_id, featured_favorite_id')
    .eq('id', userId)
    .single()

  if (!profile) notFound()

  // Check if viewer is authenticated
  const viewerSupabase = await createClient()
  const { data: { user: viewer } } = await viewerSupabase.auth.getUser()
  let viewerProfile: { display_name: string | null } | null = null
  let isBlocked = false
  if (viewer) {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', viewer.id).single()
    viewerProfile = data

    // Check if viewer has blocked this user
    if (viewer.id !== userId) {
      const { data: blockData } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', viewer.id)
        .eq('blocked_id', userId)
        .maybeSingle()
      isBlocked = !!blockData
    }
  }

  const [badges, sportFavoritesResult] = await Promise.all([
    getUserBadges(userId),
    supabase
      .from('user_sport_favorites')
      .select('id, banner_color_scheme, sport_id, school_id, schools(id, name, logo_url, primary_color, secondary_color), sports(name)')
      .eq('user_id', userId)
      .order('created_at'),
  ])

  interface SportFavoriteRow {
    id: string
    banner_color_scheme: string
    sport_id: string
    school_id: string
    schools: { id: string; name: string; logo_url: string | null; primary_color: string; secondary_color: string } | null
    sports: { name: string } | null
  }

  const favorites = ((sportFavoritesResult.data || []) as unknown as SportFavoriteRow[])
    .filter(sf => sf.schools)
    .map(sf => ({
      id: sf.id,
      sportName: sf.sports?.name || 'Unknown',
      school: sf.schools!,
      bannerColorScheme: (sf.banner_color_scheme || 'primary') as 'primary' | 'alternate',
    }))

  // Determine the featured favorite to display
  const featuredFavorite = favorites.find(f => f.id === profile.featured_favorite_id) || favorites[0] || null

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <BadgeCelebration />
      {viewer ? (
        <Header userName={viewerProfile?.display_name} userEmail={viewer.email} userId={viewer.id} />
      ) : (
        <header className="bg-surface/50 border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-text-primary">
              Rivyls
            </Link>
            <Link
              href="/login"
              className="text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              Sign in
            </Link>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header */}
        <div className="bg-surface rounded-lg p-6 mb-6 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-2xl font-bold text-text-secondary flex-shrink-0">
                {(profile.display_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold text-text-primary truncate">
                    {profile.display_name || 'Rivyls Player'}
                  </h1>
                  {profile.tier === 'pro' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/20 text-brand font-semibold px-3 py-1 text-sm">
                      Pro
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-sm">Member since {joinDate}</p>
              </div>
            </div>
            {featuredFavorite && (
              <div className="shrink-0">
                <span className="text-text-muted text-xs mb-1 block text-right">Their Team</span>
                <Pennant
                  school={featuredFavorite.school}
                  variant="banner"
                  size="sm"
                  colorScheme={featuredFavorite.bannerColorScheme}
                />
              </div>
            )}
          </div>
        </div>

        {/* Trophy Case */}
        {badges.length > 0 ? (
          <div className="bg-surface rounded-lg p-6 mb-6">
            <TrophyCase
              badges={badges}
              displayName={profile.display_name || 'This player'}
            />
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-6 mb-6 text-center">
            <p className="text-text-secondary">No badges earned yet.</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-surface rounded-lg p-6 text-center">
          <p className="text-text-secondary mb-4">
            Play Fantasy College Sports on Rivyls
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-brand hover:bg-brand-hover text-text-primary font-semibold rounded-lg transition-colors inline-block"
          >
            Get Started Free
          </Link>
        </div>

        {/* Block user — intentionally at the bottom */}
        {viewer && viewer.id !== userId && (
          <div className="mt-6 text-center">
            <BlockUserButton targetUserId={userId} initiallyBlocked={isBlocked} />
          </div>
        )}
      </main>
    </div>
  )
}
