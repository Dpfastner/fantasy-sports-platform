import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/server'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')

  if (!leagueId) {
    return new Response('Missing leagueId', { status: 400 })
  }

  const supabase = createAdminClient()

  const [leagueResult, teamsResult] = await Promise.all([
    supabase
      .from('leagues')
      .select('name, seasons(year)')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('fantasy_teams')
      .select('name, total_points')
      .eq('league_id', leagueId)
      .order('total_points', { ascending: false })
      .limit(5),
  ])

  if (!leagueResult.data) {
    return new Response('League not found', { status: 404 })
  }

  const league = leagueResult.data
  const teams = (teamsResult.data || []) as { name: string; total_points: number }[]
  const fonts = await loadFonts()

  return new ImageResponse(
    (
      <CardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 36,
              fontFamily: 'Montserrat',
              fontWeight: 700,
              color: OG.textPrimary,
              marginBottom: 4,
            }}
          >
            {league.name}
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: OG.textSecondary, marginBottom: 28 }}>
            Standings
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {teams.map((team, i) => (
              <div
                key={team.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  backgroundColor: i === 0 ? 'rgba(245, 166, 35, 0.15)' : OG.bgSurface,
                  borderRadius: 8,
                  borderLeft: i === 0 ? `4px solid ${OG.gold}` : '4px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 22,
                      fontWeight: 700,
                      color: i === 0 ? OG.gold : OG.textMuted,
                      width: 40,
                      fontFamily: 'Montserrat',
                    }}
                  >
                    {i + 1}.
                  </div>
                  <div style={{ display: 'flex', fontSize: 22, color: OG.textPrimary }}>
                    {team.name}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    fontWeight: 700,
                    color: i === 0 ? OG.gold : OG.textSecondary,
                    fontFamily: 'Montserrat',
                  }}
                >
                  {team.total_points} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardLayout>
    ),
    {
      width: OG.width,
      height: OG.height,
      fonts: [
        { name: 'Montserrat', data: fonts.montserratBold, weight: 700 as const },
        { name: 'Inter', data: fonts.interRegular, weight: 400 as const },
      ],
    }
  )
}
