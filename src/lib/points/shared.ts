/**
 * Shared scoring types and pure functions.
 * Safe to import from both server and client code.
 */

export interface LeagueSettings {
  // Win scoring
  points_win: number
  points_conference_game: number
  points_over_50: number
  points_shutout: number
  points_ranked_25: number
  points_ranked_10: number
  // Loss scoring
  points_loss: number
  points_conference_game_loss: number
  points_over_50_loss: number
  points_shutout_loss: number
  points_ranked_25_loss: number
  points_ranked_10_loss: number
}

export interface Game {
  id: string
  season_id: string
  week_number: number
  home_school_id: string | null
  away_school_id: string | null
  home_score: number
  away_score: number
  home_rank: number | null
  away_rank: number | null
  status: string
  is_conference_game: boolean
  is_bowl_game: boolean
  is_playoff_game: boolean
  playoff_round: string | null
}

export interface SchoolPointsBreakdown {
  schoolId: string
  gameId: string
  seasonId: string
  weekNumber: number
  isWin: boolean
  basePoints: number
  conferenceBonus: number
  over50Bonus: number
  shutoutBonus: number
  ranked25Bonus: number
  ranked10Bonus: number
  totalPoints: number
}

// Default scoring rules (used for global school points)
export const DEFAULT_SCORING: LeagueSettings = {
  points_win: 1,
  points_conference_game: 1,
  points_over_50: 1,
  points_shutout: 1,
  points_ranked_25: 1,
  points_ranked_10: 2,
  points_loss: 0,
  points_conference_game_loss: 0,
  points_over_50_loss: 0,
  points_shutout_loss: 0,
  points_ranked_25_loss: 0,
  points_ranked_10_loss: 0,
}

// Scoring category labels for UI display
export const SCORING_CATEGORIES = {
  win: { label: 'Win', lossLabel: 'Loss' },
  conference: { label: 'Conference Game', lossLabel: 'Conference Game (L)' },
  over50: { label: '50+ Points', lossLabel: '50+ Points (L)' },
  shutout: { label: 'Shutout', lossLabel: 'Shutout (L)' },
  ranked25: { label: 'Ranked Opponent (11-25)', lossLabel: 'Ranked Opponent (11-25) (L)' },
  ranked10: { label: 'Ranked Opponent (1-10)', lossLabel: 'Ranked Opponent (1-10) (L)' },
} as const

/**
 * Calculate points for a single school in a single game.
 * Pure function — no Supabase dependency.
 *
 * Scoring rules by game type:
 * - Championship: NO regular scoring (all 0) - uses event bonus only
 * - Bowl games: Win + 50+ + shutout, NO conference, NO ranked bonuses
 * - Playoffs (R1, QF, SF): Win + 50+ + shutout, NO conference, ranked 1-12 only
 * - Regular season: Win + conf + 50+ + shutout + ranked bonuses (1-10: +2, 11-25: +1)
 */
export function calculateSchoolGamePoints(
  game: Game,
  schoolId: string,
  opponentRank: number | null,
  scoring: LeagueSettings = DEFAULT_SCORING,
  isBowlGame: boolean = false
): SchoolPointsBreakdown {
  const isHome = game.home_school_id === schoolId
  const teamScore = isHome ? game.home_score : game.away_score
  const opponentScore = isHome ? game.away_score : game.home_score
  const isWin = teamScore > opponentScore

  // Championship game: NO regular scoring - only championship_win/loss bonus from event system
  const isChampionship = game.playoff_round === 'championship'
  if (isChampionship) {
    return {
      schoolId,
      gameId: game.id,
      seasonId: game.season_id,
      weekNumber: game.week_number,
      isWin,
      basePoints: 0,
      conferenceBonus: 0,
      over50Bonus: 0,
      shutoutBonus: 0,
      ranked25Bonus: 0,
      ranked10Bonus: 0,
      totalPoints: 0,
    }
  }

  // Calculate bonuses based on win/loss
  let basePoints = 0
  let conferenceBonus = 0
  let over50Bonus = 0
  let shutoutBonus = 0
  let ranked25Bonus = 0
  let ranked10Bonus = 0

  if (isWin) {
    basePoints = scoring.points_win
    if (game.is_conference_game && !isBowlGame && !game.is_playoff_game) {
      conferenceBonus = scoring.points_conference_game
    }
    if (teamScore >= 50) over50Bonus = scoring.points_over_50
    if (opponentScore === 0) shutoutBonus = scoring.points_shutout

    if (opponentRank) {
      if (isBowlGame) {
        // Bowl games: NO ranked bonuses
      } else if (game.is_playoff_game) {
        if (opponentRank <= 12) ranked10Bonus = scoring.points_ranked_10
      } else {
        if (opponentRank <= 10) {
          ranked10Bonus = scoring.points_ranked_10
        } else if (opponentRank <= 25) {
          ranked25Bonus = scoring.points_ranked_25
        }
      }
    }
  } else {
    basePoints = scoring.points_loss
    if (game.is_conference_game && !isBowlGame && !game.is_playoff_game) {
      conferenceBonus = scoring.points_conference_game_loss
    }
    if (teamScore >= 50) over50Bonus = scoring.points_over_50_loss
    if (opponentScore === 0) shutoutBonus = scoring.points_shutout_loss

    if (opponentRank) {
      if (isBowlGame) {
        // Bowl games: NO ranked bonuses
      } else if (game.is_playoff_game) {
        if (opponentRank <= 12) ranked10Bonus = scoring.points_ranked_10_loss
      } else {
        if (opponentRank <= 10) {
          ranked10Bonus = scoring.points_ranked_10_loss
        } else if (opponentRank <= 25) {
          ranked25Bonus = scoring.points_ranked_25_loss
        }
      }
    }
  }

  const totalPoints = basePoints + conferenceBonus + over50Bonus + shutoutBonus + ranked25Bonus + ranked10Bonus

  return {
    schoolId,
    gameId: game.id,
    seasonId: game.season_id,
    weekNumber: game.week_number,
    isWin,
    basePoints,
    conferenceBonus,
    over50Bonus,
    shutoutBonus,
    ranked25Bonus,
    ranked10Bonus,
    totalPoints,
  }
}
