import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/server'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'
import { getLeagueYear } from '@/lib/league-helpers'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')

  if (!leagueId) {
    return new Response('Missing leagueId', { status: 400 })
  }

  const supabase = createAdminClient()

  const [leagueResult, gamesResult] = await Promise.all([
    supabase
      .from('leagues')
      .select('name, seasons(year)')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('games')
      .select(`
        id, week_number, status, home_score, away_score,
        home_team:schools!games_home_team_id_fkey(name, short_name),
        away_team:schools!games_away_team_id_fkey(name, short_name)
      `)
      .eq('is_playoff_game', true)
      .order('week_number', { ascending: true })
      .limit(15),
  ])

  if (!leagueResult.data) {
    return new Response('League not found', { status: 404 })
  }

  const league = leagueResult.data
  const year = getLeagueYear(league.seasons)
  const fonts = await loadFonts()

  type GameRow = {
    id: string
    week_number: number
    status: string
    home_score: number | null
    away_score: number | null
    home_team: { name: string; short_name: string } | null
    away_team: { name: string; short_name: string } | null
  }

  const games = (gamesResult.data || []) as unknown as GameRow[]

  // Group by round
  const rounds: Record<string, GameRow[]> = {}
  for (const game of games) {
    const roundLabel = getRoundLabel(game.week_number)
    if (!rounds[roundLabel]) rounds[roundLabel] = []
    rounds[roundLabel].push(game)
  }

  const roundEntries = Object.entries(rounds)

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
            {year} College Football Playoff Bracket
          </div>

          {games.length === 0 ? (
            <div style={{ display: 'flex', fontSize: 24, color: OG.textMuted, flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
              Bracket not yet available — check back during playoffs!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {roundEntries.slice(0, 4).map(([round, matchups]) => (
                <div key={round} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', fontSize: 14, color: OG.gold, fontFamily: 'Montserrat', fontWeight: 700, marginBottom: 4 }}>
                    {round}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {matchups.map((game) => {
                      const homeName = game.home_team?.short_name || game.home_team?.name || '?'
                      const awayName = game.away_team?.short_name || game.away_team?.name || '?'
                      const isFinal = game.status === 'final'
                      const homeWon = isFinal && (game.home_score || 0) > (game.away_score || 0)
                      const awayWon = isFinal && (game.away_score || 0) > (game.home_score || 0)

                      return (
                        <div
                          key={game.id}
                          style={{
                            display: 'flex',
                            backgroundColor: OG.bgSurface,
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 16,
                          }}
                        >
                          <span style={{ color: awayWon ? OG.gold : OG.textPrimary, fontWeight: awayWon ? 700 : 400 }}>
                            {awayName}
                          </span>
                          <span style={{ color: OG.textMuted, margin: '0 6px' }}>vs</span>
                          <span style={{ color: homeWon ? OG.gold : OG.textPrimary, fontWeight: homeWon ? 700 : 400 }}>
                            {homeName}
                          </span>
                          {isFinal && (
                            <span style={{ color: OG.textMuted, marginLeft: 8, fontSize: 14 }}>
                              ({game.away_score}-{game.home_score})
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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

function getRoundLabel(weekNumber: number): string {
  // Week numbers from season constants
  if (weekNumber === 16) return 'First Round'
  if (weekNumber === 17) return 'Quarterfinals'
  if (weekNumber === 18) return 'Semifinals'
  if (weekNumber === 19) return 'Championship'
  return `Week ${weekNumber}`
}
