import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeagueContextProvider } from '@/contexts/LeagueContext'
import type { LeagueSummary, TeamSummary } from '@/contexts/LeagueContext'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function LeagueLayout({ children, params }: LayoutProps) {
  const { id: leagueId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch all header data in parallel
  const [
    { data: currentLeague },
    { data: membership },
    { data: userLeagueMemberships },
    { data: teamsInLeague },
  ] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, sports(name, slug)')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('league_members')
      .select('leagues(id, name, sports(name, slug))')
      .eq('user_id', user.id),
    supabase
      .from('fantasy_teams')
      .select('id, name, user_id, primary_color, secondary_color, image_url')
      .eq('league_id', leagueId)
      .order('name'),
  ])

  // If league doesn't exist, let the page handle it (notFound)
  if (!currentLeague) {
    return <>{children}</>
  }

  const sports = currentLeague.sports as { name: string; slug: string } | { name: string; slug: string }[] | null
  const sportName = Array.isArray(sports) ? sports[0]?.name || '' : sports?.name || ''
  const sportSlug = Array.isArray(sports) ? sports[0]?.slug || '' : sports?.slug || ''

  const userLeagues: LeagueSummary[] = (userLeagueMemberships || [])
    .map((m: Record<string, unknown>) => {
      const l = m.leagues as Record<string, unknown> | null
      if (!l) return null
      const s = l.sports as { name: string; slug: string } | { name: string; slug: string }[] | null
      return {
        id: l.id as string,
        name: l.name as string,
        sportName: Array.isArray(s) ? s[0]?.name || '' : (s as { name: string } | null)?.name || '',
        sportSlug: Array.isArray(s) ? s[0]?.slug || '' : (s as { slug: string } | null)?.slug || '',
      }
    })
    .filter((l): l is LeagueSummary => l !== null)

  const teams: TeamSummary[] = (teamsInLeague || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    name: t.name as string,
    userId: t.user_id as string,
    primaryColor: (t.primary_color as string) || '#4F46E5',
    secondaryColor: (t.secondary_color as string) || '#FFFFFF',
    imageUrl: (t.image_url as string) || null,
  }))

  const userTeam = teams.find(t => t.userId === user.id) || null
  const isCommissioner = membership?.role === 'commissioner' || membership?.role === 'co_commissioner'

  const contextValue = {
    currentLeague: {
      id: leagueId,
      name: currentLeague.name,
      sportName,
    },
    userLeagues,
    teamsInLeague: teams,
    userTeam,
    isCommissioner,
  }

  return (
    <LeagueContextProvider value={contextValue}>
      {children}
    </LeagueContextProvider>
  )
}
