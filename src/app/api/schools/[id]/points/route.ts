import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : null

    const supabase = getSupabaseAdmin()

    // Get school info
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, abbreviation, logo_url, conference')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Get season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: `Season ${year} not found` },
        { status: 404 }
      )
    }

    // Build query for school weekly points
    let pointsQuery = supabase
      .from('school_weekly_points')
      .select(`
        week_number,
        game_id,
        base_points,
        conference_bonus,
        over_50_bonus,
        shutout_bonus,
        ranked_25_bonus,
        ranked_10_bonus,
        total_points
      `)
      .eq('school_id', schoolId)
      .eq('season_id', season.id)
      .order('week_number', { ascending: true })

    if (week !== null) {
      pointsQuery = pointsQuery.eq('week_number', week)
    }

    const { data: weeklyPoints, error: pointsError } = await pointsQuery

    if (pointsError) {
      return NextResponse.json(
        { error: 'Failed to fetch points', details: pointsError.message },
        { status: 500 }
      )
    }

    // Get game details for context
    const gameIds = (weeklyPoints || []).map(wp => wp.game_id).filter(Boolean)
    let games: Record<string, {
      opponent: string
      opponentLogo: string | null
      score: string
      isWin: boolean
      isHome: boolean
    }> = {}

    if (gameIds.length > 0) {
      const { data: gamesData } = await supabase
        .from('games')
        .select(`
          id,
          home_school_id,
          away_school_id,
          home_score,
          away_score,
          home_team_name,
          away_team_name,
          home_team_logo_url,
          away_team_logo_url
        `)
        .in('id', gameIds)

      for (const game of gamesData || []) {
        const isHome = game.home_school_id === schoolId
        const teamScore = isHome ? game.home_score : game.away_score
        const oppScore = isHome ? game.away_score : game.home_score
        const isWin = (teamScore || 0) > (oppScore || 0)

        games[game.id] = {
          opponent: isHome ? game.away_team_name : game.home_team_name,
          opponentLogo: isHome ? game.away_team_logo_url : game.home_team_logo_url,
          score: `${teamScore}-${oppScore}`,
          isWin,
          isHome,
        }
      }
    }

    // Calculate season totals
    const seasonTotals = (weeklyPoints || []).reduce(
      (acc, wp) => ({
        basePoints: acc.basePoints + Number(wp.base_points),
        conferenceBonus: acc.conferenceBonus + Number(wp.conference_bonus),
        over50Bonus: acc.over50Bonus + Number(wp.over_50_bonus),
        shutoutBonus: acc.shutoutBonus + Number(wp.shutout_bonus),
        ranked25Bonus: acc.ranked25Bonus + Number(wp.ranked_25_bonus),
        ranked10Bonus: acc.ranked10Bonus + Number(wp.ranked_10_bonus),
        totalPoints: acc.totalPoints + Number(wp.total_points),
        wins: acc.wins + (wp.base_points > 0 ? 1 : 0),
        losses: acc.losses + (wp.base_points === 0 ? 1 : 0),
      }),
      {
        basePoints: 0,
        conferenceBonus: 0,
        over50Bonus: 0,
        shutoutBonus: 0,
        ranked25Bonus: 0,
        ranked10Bonus: 0,
        totalPoints: 0,
        wins: 0,
        losses: 0,
      }
    )

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.name,
        abbreviation: school.abbreviation,
        logoUrl: school.logo_url,
        conference: school.conference,
      },
      year,
      seasonTotals,
      weeklyBreakdown: (weeklyPoints || []).map(wp => ({
        week: wp.week_number,
        gameId: wp.game_id,
        game: wp.game_id ? games[wp.game_id] : null,
        breakdown: {
          basePoints: Number(wp.base_points),
          conferenceBonus: Number(wp.conference_bonus),
          over50Bonus: Number(wp.over_50_bonus),
          shutoutBonus: Number(wp.shutout_bonus),
          ranked25Bonus: Number(wp.ranked_25_bonus),
          ranked10Bonus: Number(wp.ranked_10_bonus),
          totalPoints: Number(wp.total_points),
        },
      })),
    })
  } catch (error) {
    console.error('School points error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch school points', details: String(error) },
      { status: 500 }
    )
  }
}
