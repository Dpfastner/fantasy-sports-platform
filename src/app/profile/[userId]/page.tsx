import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserBadges } from '@/lib/badges'
import { TrophyCase } from '@/components/TrophyCase'
import { SITE_URL } from '@/lib/og/constants'

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
    .select('display_name, tier, created_at')
    .eq('id', userId)
    .single()

  if (!profile) notFound()

  const badges = await getUserBadges(userId)

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-2xl font-bold text-text-secondary flex-shrink-0">
              {(profile.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-text-primary">
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
            Play Fantasy College Football on Rivyls
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-brand hover:bg-brand-hover text-text-primary font-semibold rounded-lg transition-colors inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  )
}
