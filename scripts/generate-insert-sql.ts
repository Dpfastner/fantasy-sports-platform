import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

interface LeagueSettings {
  points_heisman_winner: number | null
  points_bowl_appearance: number | null
  points_playoff_first_round: number | null
  points_playoff_quarterfinal: number | null
  points_playoff_semifinal: number | null
  points_championship_win: number | null
  points_championship_loss: number | null
  points_conference_championship_win: number | null
  points_conference_championship_loss: number | null
}

interface Game {
  id: string
  week_number: number
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  playoff_round: string | null
  is_conference_game: boolean
  is_bowl_game: boolean
  is_playoff_game: boolean
  status: string
}

async function generateSQL() {
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) return

  const { data: leagues } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      season_id,
      league_settings (
        points_heisman_winner,
        points_bowl_appearance,
        points_playoff_first_round,
        points_playoff_quarterfinal,
        points_playoff_semifinal,
        points_championship_win,
        points_championship_loss,
        points_conference_championship_win,
        points_conference_championship_loss
      )
    `)
    .eq('season_id', season.id)

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', season.id)
    .eq('status', 'completed')
    .gte('week_number', 15)

  const { data: heismanWinners } = await supabase
    .from('heisman_winners')
    .select('school_id')
    .eq('season_id', season.id)

  const heismanSchoolId = heismanWinners?.[0]?.school_id

  const confChampGames = games?.filter((g: Game) => g.week_number === 15 && g.is_conference_game) || []
  const bowlGames = games?.filter((g: Game) => g.week_number === 17 && g.is_bowl_game && !g.is_playoff_game) || []
  const cfpFirstRoundGames = games?.filter((g: Game) => g.playoff_round === 'first_round') || []
  const cfpQuarterfinalGames = games?.filter((g: Game) => g.playoff_round === 'quarterfinal') || []
  const cfpSemifinalGames = games?.filter((g: Game) => g.playoff_round === 'semifinal') || []
  const championshipGame = games?.find((g: Game) => g.playoff_round === 'championship')

  const values: string[] = []

  for (const league of leagues || []) {
    const settings = (Array.isArray(league.league_settings)
      ? league.league_settings[0]
      : league.league_settings) as LeagueSettings | null

    if (!settings) continue

    // Conference Championship
    for (const game of confChampGames) {
      if (!game.home_school_id || !game.away_school_id) continue
      if (game.home_score === null || game.away_score === null) continue
      const homeWon = game.home_score > game.away_score
      const winnerId = homeWon ? game.home_school_id : game.away_school_id
      const loserId = homeWon ? game.away_school_id : game.home_school_id

      if (settings.points_conference_championship_win) {
        values.push(`('${league.id}', '${winnerId}', '${season.id}', 15, 'conf_championship_win', ${settings.points_conference_championship_win}, '${game.id}')`)
      }
      if (settings.points_conference_championship_loss) {
        values.push(`('${league.id}', '${loserId}', '${season.id}', 15, 'conf_championship_loss', ${settings.points_conference_championship_loss}, '${game.id}')`)
      }
    }

    // Bowl games
    for (const game of bowlGames) {
      if (settings.points_bowl_appearance) {
        if (game.home_school_id) {
          values.push(`('${league.id}', '${game.home_school_id}', '${season.id}', 17, 'bowl_appearance', ${settings.points_bowl_appearance}, '${game.id}')`)
        }
        if (game.away_school_id) {
          values.push(`('${league.id}', '${game.away_school_id}', '${season.id}', 17, 'bowl_appearance', ${settings.points_bowl_appearance}, '${game.id}')`)
        }
      }
    }

    // CFP First Round
    for (const game of cfpFirstRoundGames) {
      if (settings.points_playoff_first_round) {
        if (game.home_school_id) {
          values.push(`('${league.id}', '${game.home_school_id}', '${season.id}', 18, 'cfp_first_round', ${settings.points_playoff_first_round}, '${game.id}')`)
        }
        if (game.away_school_id) {
          values.push(`('${league.id}', '${game.away_school_id}', '${season.id}', 18, 'cfp_first_round', ${settings.points_playoff_first_round}, '${game.id}')`)
        }
      }
    }

    // CFP Quarterfinals
    for (const game of cfpQuarterfinalGames) {
      if (settings.points_playoff_quarterfinal) {
        if (game.home_school_id) {
          values.push(`('${league.id}', '${game.home_school_id}', '${season.id}', 19, 'cfp_quarterfinal', ${settings.points_playoff_quarterfinal}, '${game.id}')`)
        }
        if (game.away_school_id) {
          values.push(`('${league.id}', '${game.away_school_id}', '${season.id}', 19, 'cfp_quarterfinal', ${settings.points_playoff_quarterfinal}, '${game.id}')`)
        }
      }
    }

    // CFP Semifinals
    for (const game of cfpSemifinalGames) {
      if (settings.points_playoff_semifinal) {
        if (game.home_school_id) {
          values.push(`('${league.id}', '${game.home_school_id}', '${season.id}', 20, 'cfp_semifinal', ${settings.points_playoff_semifinal}, '${game.id}')`)
        }
        if (game.away_school_id) {
          values.push(`('${league.id}', '${game.away_school_id}', '${season.id}', 20, 'cfp_semifinal', ${settings.points_playoff_semifinal}, '${game.id}')`)
        }
      }
    }

    // Heisman
    if (heismanSchoolId && settings.points_heisman_winner) {
      values.push(`('${league.id}', '${heismanSchoolId}', '${season.id}', 20, 'heisman', ${settings.points_heisman_winner}, NULL)`)
    }

    // Championship
    if (championshipGame && championshipGame.home_score !== null && championshipGame.away_score !== null) {
      const homeWon = championshipGame.home_score > championshipGame.away_score
      const winnerId = homeWon ? championshipGame.home_school_id : championshipGame.away_school_id
      const loserId = homeWon ? championshipGame.away_school_id : championshipGame.home_school_id

      if (winnerId && settings.points_championship_win) {
        values.push(`('${league.id}', '${winnerId}', '${season.id}', 21, 'championship_win', ${settings.points_championship_win}, '${championshipGame.id}')`)
      }
      if (loserId && settings.points_championship_loss) {
        values.push(`('${league.id}', '${loserId}', '${season.id}', 21, 'championship_loss', ${settings.points_championship_loss}, '${championshipGame.id}')`)
      }
    }
  }

  console.log('-- Run this SQL in Supabase SQL Editor:\n')
  console.log('INSERT INTO league_school_event_bonuses (league_id, school_id, season_id, week_number, bonus_type, points, game_id) VALUES')
  console.log(values.join(',\n') + ';')
}

generateSQL()
