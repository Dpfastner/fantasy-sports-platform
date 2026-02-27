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

  const [leagueResult, weeklyResult, prevWeekResult] = await Promise.all([
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
    weekNum > 1
      ? supabase
          .from('fantasy_teams')
          .select('id, total_points')
          .eq('league_id', leagueId)
      : { data: [] },
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

  // Top scorer
  const topScorer = weeklyData[0]
  const topScorerName = topScorer?.fantasy_teams?.name || 'N/A'
  const topScorerPoints = topScorer?.points || 0

  // High points winner
  const highPointsWinner = weeklyData.find((w) => w.is_high_points_winner)
  const highPointsName = highPointsWinner?.fantasy_teams?.name
  const highPointsAmount = highPointsWinner?.high_points_amount || 0

  // Top 5 for this week
  const top5 = weeklyData.slice(0, 5)

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
            {leagueResult.data.name}
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: OG.textSecondary, marginBottom: 24 }}>
            Week {weekNum} Recap
          </div>

          {/* Highlights */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <HighlightBox
              emoji="🏆"
              label="Top Scorer"
              value={topScorerName}
              sub={`${topScorerPoints} pts`}
            />
            {highPointsName && (
              <HighlightBox
                emoji="💰"
                label="High Points"
                value={highPointsName}
                sub={`$${highPointsAmount}`}
              />
            )}
          </div>

          {/* Week scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top5.map((entry, i) => (
              <div
                key={entry.fantasy_team_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 16px',
                  backgroundColor: i === 0 ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', fontSize: 20, color: OG.textPrimary }}>
                  <span style={{ width: 30, color: OG.textMuted }}>{i + 1}.</span>
                  {entry.fantasy_teams?.name || 'Unknown'}
                </div>
                <div style={{ display: 'flex', fontSize: 20, color: OG.textSecondary, fontFamily: 'Montserrat', fontWeight: 700 }}>
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

function HighlightBox({
  emoji,
  label,
  value,
  sub,
}: {
  emoji: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: OG.bgSurface,
        borderRadius: 8,
        padding: '16px 24px',
        flexGrow: 1,
      }}
    >
      <div style={{ display: 'flex', fontSize: 14, color: OG.textMuted, marginBottom: 4 }}>
        {emoji} {label}
      </div>
      <div style={{ display: 'flex', fontSize: 22, fontFamily: 'Montserrat', fontWeight: 700, color: OG.textPrimary }}>
        {value}
      </div>
      <div style={{ display: 'flex', fontSize: 16, color: OG.gold }}>
        {sub}
      </div>
    </div>
  )
}
