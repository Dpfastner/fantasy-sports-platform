import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single() as { data: { display_name: string | null; email: string } | null }

  // Get user's leagues (as member or commissioner)
  const { data: leagueMemberships } = await supabase
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={profile?.display_name} userEmail={user.email} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">My Leagues</h1>
          <div className="flex gap-4">
            <Link
              href="/leagues/join"
              className="bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
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
                className="bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
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
                className="bg-surface rounded-lg p-6 hover:bg-surface transition-colors border border-border hover:border-border"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-text-primary">
                    {league.name}
                  </h3>
                  {league.role === 'commissioner' && (
                    <span className="bg-warning/20 text-warning-text text-xs px-2 py-1 rounded">
                      Commissioner
                    </span>
                  )}
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
