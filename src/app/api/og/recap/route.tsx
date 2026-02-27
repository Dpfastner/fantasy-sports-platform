import { ImageResponse } from '@vercel/og'
import { createAdminClient } from '@/lib/supabase/server'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')
  const week = searchParams.get('week')

  if (!leagueId || !week) {
    return new Response('Missing leagueId or week', { status: 400 })
  }

  const weekNum = parseInt(week, 10)
  if (isNaN(weekNum)) {
    return new Response('Invalid week', { status: 400 })
  }

  const supabase = createAdminClient()

  const [leagueResult, weeklyResult] = await Promise.all([
    supabase
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('weekly_points')
      .select('fantasy_team_id, points, is_high_points_winner, high_points_amount, fantasy_teams(name)')
      .eq('league_id', leagueId)
      .eq('week_number', weekNum)
      .order('points', { ascending: false }),
  ])

  if (!leagueResult.data) {
    return new Response('League not found', { status: 404 })
  }

  const fonts = await loadFonts()

  type WeeklyRow = {
    fantasy_team_id: string
    points: number
    is_high_points_winner: boolean
    high_points_amount: number
    fantasy_teams: { name: string } | null
  }

  const weeklyData = (weeklyResult.data || []) as unknown as WeeklyRow[]

  const topScorer = weeklyData[0]
  const topScorerName = topScorer?.fantasy_teams?.name || 'N/A'
  const topScorerPoints = topScorer?.points || 0

  const highPointsWinner = weeklyData.find((w) => w.is_high_points_winner)
  const highPointsName = highPointsWinner?.fantasy_teams?.name
  const highPointsAmount = highPointsWinner?.high_points_amount || 0

  // Top 3 runners-up (skip #1 since they're in the hero)
  const runnersUp = weeklyData.slice(1, 4)

  return new ImageResponse(
    (
      <CardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontFamily: 'Montserrat',
              fontWeight: 700,
              color: OG.textPrimary,
              marginBottom: 4,
            }}
          >
            {leagueResult.data.name}
          </div>

          {/* Winner Hero */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(245, 166, 35, 0.08)',
              border: `2px solid ${OG.gold}`,
              borderRadius: 12,
              padding: '20px 32px',
              marginBottom: 20,
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                fontFamily: 'Montserrat',
                fontWeight: 700,
                color: OG.textMuted,
                letterSpacing: '0.2em',
                marginBottom: 4,
              }}
            >
              WEEK {weekNum}
            </div>
            <div style={{ display: 'flex', fontSize: 48, marginBottom: 4 }}>
              🏆
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Montserrat',
                fontWeight: 700,
                fontSize: 44,
                color: OG.gold,
                textAlign: 'center',
                lineHeight: 1.1,
                marginBottom: 6,
              }}
            >
              {topScorerName}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                fontFamily: 'Montserrat',
                fontWeight: 700,
                letterSpacing: '0.3em',
                color: OG.textSecondary,
                marginBottom: 8,
              }}
            >
              WINNER
            </div>
            <div
              style={{
                display: 'flex',
                backgroundColor: OG.gold,
                color: OG.bgPage,
                fontFamily: 'Montserrat',
                fontWeight: 700,
                fontSize: 20,
                borderRadius: 20,
                padding: '4px 20px',
              }}
            >
              {topScorerPoints} pts
            </div>
          </div>

          {/* High points bonus */}
          {highPointsName && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 16,
                  color: OG.textSecondary,
                  backgroundColor: OG.bgSurface,
                  borderRadius: 8,
                  padding: '8px 20px',
                }}
              >
                💰 High Points: {highPointsName} (+${highPointsAmount})
              </div>
            </div>
          )}

          {/* Runners up */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runnersUp.map((entry, i) => (
              <div
                key={entry.fantasy_team_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 16px',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', fontSize: 18, color: OG.textPrimary }}>
                  <span style={{ width: 30, color: OG.textMuted }}>{i + 2}.</span>
                  {entry.fantasy_teams?.name || 'Unknown'}
                </div>
                <div style={{ display: 'flex', fontSize: 18, color: OG.textSecondary, fontFamily: 'Montserrat', fontWeight: 700 }}>
                  {entry.points} pts
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
