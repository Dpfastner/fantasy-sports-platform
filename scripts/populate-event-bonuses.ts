import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

/**
 * Populates league_school_event_bonuses table with special event bonuses
 * for each league based on their settings.
 *
 * Week mapping:
 * - Week 15: Conference Championship
 * - Week 17: Bowl games
 * - Week 18: CFP First Round (seeds 5-12 play)
 * - Week 19: CFP Quarterfinals
 * - Week 20: CFP Semifinals
 * - Week 21: National Championship
 * - Week 22: Heisman (separate column for display)
 */

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

async function populateEventBonuses() {
  console.log('=== Populating League School Event Bonuses ===\n')

  // Get season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.error('Season not found')
    return
  }

  console.log(`Season ID: ${season.id}`)

  // Get all leagues and their settings
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

  if (!leagues || leagues.length === 0) {
    console.log('No leagues found')
    return
  }

  console.log(`Found ${leagues.length} leagues\n`)

  // Get all relevant games
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', season.id)
    .eq('status', 'completed')
    .gte('week_number', 15)

  if (!games) {
    console.log('No games found')
    return
  }

  console.log(`Found ${games.length} postseason games\n`)

  // Categorize games by type
  const confChampGames = games.filter((g: Game) => g.week_number === 15 && g.is_conference_game)
  const bowlGames = games.filter((g: Game) => g.week_number === 17 && g.is_bowl_game && !g.is_playoff_game)
  const cfpFirstRoundGames = games.filter((g: Game) => g.playoff_round === 'first_round')
  const cfpQuarterfinalGames = games.filter((g: Game) => g.playoff_round === 'quarterfinal')
  const cfpSemifinalGames = games.filter((g: Game) => g.playoff_round === 'semifinal')
  const championshipGame = games.find((g: Game) => g.playoff_round === 'championship')

  console.log(`Conference Championship games: ${confChampGames.length}`)
  console.log(`Bowl games: ${bowlGames.length}`)
  console.log(`CFP First Round games: ${cfpFirstRoundGames.length}`)
  console.log(`CFP Quarterfinal games: ${cfpQuarterfinalGames.length}`)
  console.log(`CFP Semifinal games: ${cfpSemifinalGames.length}`)
  console.log(`Championship game: ${championshipGame ? 'Yes' : 'No'}`)

  // Identify bye teams (top 4 seeds who are in quarterfinals but didn't play first round)
  // These teams automatically get CFP First Round points
  const firstRoundSchools = new Set<string>()
  for (const game of cfpFirstRoundGames) {
    if (game.home_school_id) firstRoundSchools.add(game.home_school_id)
    if (game.away_school_id) firstRoundSchools.add(game.away_school_id)
  }

  const quarterfinalSchools = new Set<string>()
  for (const game of cfpQuarterfinalGames) {
    if (game.home_school_id) quarterfinalSchools.add(game.home_school_id)
    if (game.away_school_id) quarterfinalSchools.add(game.away_school_id)
  }

  // Bye teams = in quarterfinals but not in first round
  const byeTeams = [...quarterfinalSchools].filter(s => !firstRoundSchools.has(s))
  console.log(`Bye teams (top 4 seeds): ${byeTeams.length}`)

  // Get Heisman winner
  const { data: heismanWinners } = await supabase
    .from('heisman_winners')
    .select('school_id')
    .eq('season_id', season.id)

  const heismanSchoolId = heismanWinners?.[0]?.school_id
  console.log(`Heisman winner school: ${heismanSchoolId || 'None'}`)

  // Build school bonus mapping for each event type
  const bonusRecords: Array<{
    league_id: string
    school_id: string
    season_id: string
    week_number: number
    bonus_type: string
    points: number
    game_id: string | null
  }> = []

  // Process each league
  for (const league of leagues) {
    console.log(`\nProcessing league: ${league.name}`)
    const settings = (Array.isArray(league.league_settings)
      ? league.league_settings[0]
      : league.league_settings) as LeagueSettings | null

    if (!settings) {
      console.log('  No settings found, skipping')
      continue
    }

    // Conference Championship Winners/Losers (Week 15)
    for (const game of confChampGames) {
      if (!game.home_school_id || !game.away_school_id) continue
      if (game.home_score === null || game.away_score === null) continue

      const homeWon = game.home_score > game.away_score
      const winnerId = homeWon ? game.home_school_id : game.away_school_id
      const loserId = homeWon ? game.away_school_id : game.home_school_id

      if (settings.points_conference_championship_win) {
        bonusRecords.push({
          league_id: league.id,
          school_id: winnerId,
          season_id: season.id,
          week_number: 15,
          bonus_type: 'conf_championship_win',
          points: settings.points_conference_championship_win,
          game_id: game.id,
        })
      }

      if (settings.points_conference_championship_loss) {
        bonusRecords.push({
          league_id: league.id,
          school_id: loserId,
          season_id: season.id,
          week_number: 15,
          bonus_type: 'conf_championship_loss',
          points: settings.points_conference_championship_loss,
          game_id: game.id,
        })
      }
    }

    // Bowl Appearances (Week 17)
    for (const game of bowlGames) {
      if (settings.points_bowl_appearance) {
        if (game.home_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.home_school_id,
            season_id: season.id,
            week_number: 17,
            bonus_type: 'bowl_appearance',
            points: settings.points_bowl_appearance,
            game_id: game.id,
          })
        }
        if (game.away_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.away_school_id,
            season_id: season.id,
            week_number: 17,
            bonus_type: 'bowl_appearance',
            points: settings.points_bowl_appearance,
            game_id: game.id,
          })
        }
      }
    }

    // CFP First Round (Week 18) - Teams that played first round games
    for (const game of cfpFirstRoundGames) {
      if (settings.points_playoff_first_round) {
        if (game.home_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.home_school_id,
            season_id: season.id,
            week_number: 18,
            bonus_type: 'cfp_first_round',
            points: settings.points_playoff_first_round,
            game_id: game.id,
          })
        }
        if (game.away_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.away_school_id,
            season_id: season.id,
            week_number: 18,
            bonus_type: 'cfp_first_round',
            points: settings.points_playoff_first_round,
            game_id: game.id,
          })
        }
      }
    }

    // CFP First Round (Week 18) - Bye teams (top 4 seeds get R1 points automatically)
    for (const schoolId of byeTeams) {
      if (settings.points_playoff_first_round) {
        bonusRecords.push({
          league_id: league.id,
          school_id: schoolId,
          season_id: season.id,
          week_number: 18,
          bonus_type: 'cfp_first_round',
          points: settings.points_playoff_first_round,
          game_id: null, // No game for bye teams
        })
      }
    }

    // CFP Quarterfinals (Week 19)
    for (const game of cfpQuarterfinalGames) {
      if (settings.points_playoff_quarterfinal) {
        if (game.home_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.home_school_id,
            season_id: season.id,
            week_number: 19,
            bonus_type: 'cfp_quarterfinal',
            points: settings.points_playoff_quarterfinal,
            game_id: game.id,
          })
        }
        if (game.away_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.away_school_id,
            season_id: season.id,
            week_number: 19,
            bonus_type: 'cfp_quarterfinal',
            points: settings.points_playoff_quarterfinal,
            game_id: game.id,
          })
        }
      }
    }

    // CFP Semifinals (Week 20)
    for (const game of cfpSemifinalGames) {
      if (settings.points_playoff_semifinal) {
        if (game.home_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.home_school_id,
            season_id: season.id,
            week_number: 20,
            bonus_type: 'cfp_semifinal',
            points: settings.points_playoff_semifinal,
            game_id: game.id,
          })
        }
        if (game.away_school_id) {
          bonusRecords.push({
            league_id: league.id,
            school_id: game.away_school_id,
            season_id: season.id,
            week_number: 20,
            bonus_type: 'cfp_semifinal',
            points: settings.points_playoff_semifinal,
            game_id: game.id,
          })
        }
      }
    }

    // Heisman (Week 22 - separate column for display)
    if (heismanSchoolId && settings.points_heisman_winner) {
      bonusRecords.push({
        league_id: league.id,
        school_id: heismanSchoolId,
        season_id: season.id,
        week_number: 22,
        bonus_type: 'heisman',
        points: settings.points_heisman_winner,
        game_id: null,
      })
    }

    // Championship (Week 21)
    if (championshipGame) {
      if (championshipGame.home_score !== null && championshipGame.away_score !== null) {
        const homeWon = championshipGame.home_score > championshipGame.away_score
        const winnerId = homeWon ? championshipGame.home_school_id : championshipGame.away_school_id
        const loserId = homeWon ? championshipGame.away_school_id : championshipGame.home_school_id

        if (winnerId && settings.points_championship_win) {
          bonusRecords.push({
            league_id: league.id,
            school_id: winnerId,
            season_id: season.id,
            week_number: 21,
            bonus_type: 'championship_win',
            points: settings.points_championship_win,
            game_id: championshipGame.id,
          })
        }

        if (loserId && settings.points_championship_loss) {
          bonusRecords.push({
            league_id: league.id,
            school_id: loserId,
            season_id: season.id,
            week_number: 21,
            bonus_type: 'championship_loss',
            points: settings.points_championship_loss,
            game_id: championshipGame.id,
          })
        }
      }
    }

    console.log(`  Created ${bonusRecords.filter(r => r.league_id === league.id).length} bonus records`)
  }

  // Delete existing records for this season (to handle re-runs)
  // Skip delete if table is new/empty to avoid schema cache issues
  console.log('\nClearing existing bonus records (if any)...')
  try {
    const { error: deleteError } = await supabase
      .from('league_school_event_bonuses')
      .delete()
      .eq('season_id', season.id)

    if (deleteError && !deleteError.message.includes('schema cache')) {
      console.error('Error deleting existing records:', deleteError)
      return
    }
  } catch (e) {
    console.log('  (Table may be new, skipping delete)')
  }

  // Insert all bonus records
  console.log(`\nInserting ${bonusRecords.length} bonus records...`)

  // Insert in batches of 500 to avoid hitting limits
  const batchSize = 500
  for (let i = 0; i < bonusRecords.length; i += batchSize) {
    const batch = bonusRecords.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('league_school_event_bonuses')
      .insert(batch)

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
      return
    }
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bonusRecords.length / batchSize)}`)
  }

  // Print summary
  console.log('\n=== Summary ===')
  const typeCounts = new Map<string, number>()
  for (const record of bonusRecords) {
    typeCounts.set(record.bonus_type, (typeCounts.get(record.bonus_type) || 0) + 1)
  }
  for (const [type, count] of typeCounts) {
    console.log(`  ${type}: ${count}`)
  }

  console.log('\n=== DONE ===')
}

populateEventBonuses()
