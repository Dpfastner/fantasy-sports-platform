import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchRugbyStandings } from '@/lib/events/espn-adapters'

// GET /api/events/standings?tournamentId=xxx
// Returns rugby standings for a tournament (ESPN for Men's, computed for Women's)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournamentId')

  if (!tournamentId) {
    return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id, config, sport')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const config = (tournament.config || {}) as Record<string, unknown>
  const espnLeagueId = config.espn_league_id as string | undefined

  // Get participants for logo mapping
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name, short_name, logo_url')
    .eq('tournament_id', tournamentId)

  const participantByCode = new Map(
    (participants || []).map(p => [p.short_name, p])
  )

  if (espnLeagueId) {
    // Men's: fetch from ESPN (has bonus points)
    const standings = await fetchRugbyStandings(espnLeagueId)

    const result = standings.map(s => {
      const participant = participantByCode.get(s.teamCode)
      return {
        ...s,
        logoUrl: participant?.logo_url || null,
        participantId: participant?.id || null,
      }
    })

    return NextResponse.json(
      { standings: result, hasBonus: true, source: 'espn' },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } }
    )
  }

  // Women's (or any without ESPN): compute from game results
  const { data: games } = await admin
    .from('event_games')
    .select('participant_1_id, participant_2_id, participant_1_score, participant_2_score, winner_id, is_draw, status')
    .eq('tournament_id', tournamentId)
    .in('status', ['completed', 'final'])

  // Build standings from game results
  const teamStats = new Map<string, {
    won: number; drawn: number; lost: number; pf: number; pa: number
  }>()

  for (const p of (participants || [])) {
    teamStats.set(p.id, { won: 0, drawn: 0, lost: 0, pf: 0, pa: 0 })
  }

  for (const g of (games || [])) {
    if (!g.participant_1_id || !g.participant_2_id) continue
    const s1 = teamStats.get(g.participant_1_id)
    const s2 = teamStats.get(g.participant_2_id)
    if (!s1 || !s2) continue

    s1.pf += g.participant_1_score || 0
    s1.pa += g.participant_2_score || 0
    s2.pf += g.participant_2_score || 0
    s2.pa += g.participant_1_score || 0

    if (g.is_draw) {
      s1.drawn++
      s2.drawn++
    } else if (g.winner_id === g.participant_1_id) {
      s1.won++
      s2.lost++
    } else if (g.winner_id === g.participant_2_id) {
      s2.won++
      s1.lost++
    }
  }

  const standings = (participants || []).map(p => {
    const s = teamStats.get(p.id)!
    const pts = s.won * 4 + s.drawn * 2
    return {
      rank: 0,
      teamCode: p.short_name || '',
      teamName: p.name,
      gamesPlayed: s.won + s.drawn + s.lost,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      pointsFor: s.pf,
      pointsAgainst: s.pa,
      pointsDifference: s.pf - s.pa,
      bonusPoints: 0,
      points: pts,
      logoUrl: p.logo_url || null,
      participantId: p.id,
    }
  })
    .sort((a, b) => b.points - a.points || b.pointsDifference - a.pointsDifference)
    .map((s, i) => ({ ...s, rank: i + 1 }))

  return NextResponse.json(
    { standings, hasBonus: false, source: 'computed' },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } }
  )
}
