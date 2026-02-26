import { describe, it, expect } from 'vitest'
import {
  calculateSchoolGamePoints,
  DEFAULT_SCORING,
  type Game,
  type LeagueSettings,
} from './shared'

// ── Test Helpers ──

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    season_id: 'season-1',
    week_number: 5,
    home_school_id: 'school-a',
    away_school_id: 'school-b',
    home_score: 28,
    away_score: 14,
    home_rank: null,
    away_rank: null,
    status: 'completed',
    is_conference_game: false,
    is_bowl_game: false,
    is_playoff_game: false,
    playoff_round: null,
    ...overrides,
  }
}

const CUSTOM_SCORING: LeagueSettings = {
  points_win: 3,
  points_conference_game: 2,
  points_over_50: 2,
  points_shutout: 3,
  points_ranked_25: 2,
  points_ranked_10: 4,
  points_loss: 1,
  points_conference_game_loss: 1,
  points_over_50_loss: 1,
  points_shutout_loss: 1,
  points_ranked_25_loss: 1,
  points_ranked_10_loss: 2,
}

const HOME = 'school-a'
const AWAY = 'school-b'

// ── Tests ──

describe('calculateSchoolGamePoints', () => {
  // ━━━ Basic win/loss ━━━

  describe('basic win/loss', () => {
    it('awards base win points for a regular win', () => {
      const game = makeGame({ home_score: 28, away_score: 14 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.isWin).toBe(true)
      expect(result.basePoints).toBe(DEFAULT_SCORING.points_win)
      expect(result.totalPoints).toBe(1)
    })

    it('awards 0 for a loss with default scoring', () => {
      const game = makeGame({ home_score: 14, away_score: 28 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.isWin).toBe(false)
      expect(result.basePoints).toBe(0)
      expect(result.totalPoints).toBe(0)
    })

    it('awards loss points when custom scoring enables them', () => {
      const game = makeGame({ home_score: 14, away_score: 28 })
      const result = calculateSchoolGamePoints(game, HOME, null, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.basePoints).toBe(1)
      expect(result.totalPoints).toBe(1)
    })

    it('correctly identifies away team as winner', () => {
      const game = makeGame({ home_score: 14, away_score: 28 })
      const result = calculateSchoolGamePoints(game, AWAY, null)

      expect(result.isWin).toBe(true)
      expect(result.basePoints).toBe(1)
    })

    it('identifies a tie as a loss (teamScore not > opponentScore)', () => {
      const game = makeGame({ home_score: 21, away_score: 21 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.isWin).toBe(false)
    })
  })

  // ━━━ Conference bonus ━━━

  describe('conference bonus', () => {
    it('awards conference bonus for a conference win', () => {
      const game = makeGame({ is_conference_game: true })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.conferenceBonus).toBe(1)
      expect(result.totalPoints).toBe(2) // win + conference
    })

    it('awards conference loss bonus with custom scoring', () => {
      const game = makeGame({
        home_score: 14,
        away_score: 28,
        is_conference_game: true,
      })
      const result = calculateSchoolGamePoints(game, HOME, null, CUSTOM_SCORING)

      expect(result.conferenceBonus).toBe(CUSTOM_SCORING.points_conference_game_loss)
    })

    it('does NOT award conference bonus for bowl games', () => {
      const game = makeGame({
        is_conference_game: true,
        is_bowl_game: true,
      })
      const result = calculateSchoolGamePoints(game, HOME, null, DEFAULT_SCORING, true)

      expect(result.conferenceBonus).toBe(0)
    })

    it('does NOT award conference bonus for playoff games', () => {
      const game = makeGame({
        is_conference_game: true,
        is_playoff_game: true,
      })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.conferenceBonus).toBe(0)
    })
  })

  // ━━━ Over 50 bonus ━━━

  describe('over 50 bonus', () => {
    it('awards over50 bonus when team scores exactly 50', () => {
      const game = makeGame({ home_score: 50, away_score: 14 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.over50Bonus).toBe(1)
    })

    it('awards over50 bonus when team scores over 50', () => {
      const game = makeGame({ home_score: 63, away_score: 7 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.over50Bonus).toBe(1)
    })

    it('does NOT award over50 bonus for 49 points', () => {
      const game = makeGame({ home_score: 49, away_score: 14 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.over50Bonus).toBe(0)
    })

    it('awards over50 on a loss if team scored 50+', () => {
      const game = makeGame({ home_score: 52, away_score: 55 })
      const result = calculateSchoolGamePoints(game, HOME, null, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.over50Bonus).toBe(CUSTOM_SCORING.points_over_50_loss)
    })

    it('does NOT count opponent score for over50 (only team score)', () => {
      const game = makeGame({ home_score: 28, away_score: 56 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.over50Bonus).toBe(0) // home only scored 28
    })
  })

  // ━━━ Shutout bonus ━━━

  describe('shutout bonus', () => {
    it('awards shutout bonus when opponent scores 0', () => {
      const game = makeGame({ home_score: 35, away_score: 0 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.shutoutBonus).toBe(1)
      expect(result.totalPoints).toBe(2) // win + shutout
    })

    it('does NOT award shutout when opponent scores > 0', () => {
      const game = makeGame({ home_score: 35, away_score: 3 })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.shutoutBonus).toBe(0)
    })

    it('shutout bonus on loss only applies when OPPONENT scores 0 (not when team scores 0)', () => {
      // Team scored 0, opponent scored 28 — opponent did NOT score 0, no shutout bonus
      const game = makeGame({ home_score: 0, away_score: 28 })
      const result = calculateSchoolGamePoints(game, HOME, null, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.shutoutBonus).toBe(0) // shutout = opponent scores 0, not team
    })

    it('awards shutout loss bonus in a 0-0 tie (opponent scored 0)', () => {
      const game = makeGame({ home_score: 0, away_score: 0 })
      const result = calculateSchoolGamePoints(game, HOME, null, CUSTOM_SCORING)

      expect(result.isWin).toBe(false) // tie = loss
      expect(result.shutoutBonus).toBe(CUSTOM_SCORING.points_shutout_loss)
    })
  })

  // ━━━ Ranked opponent bonuses — regular season ━━━

  describe('ranked opponent — regular season', () => {
    it('awards ranked_10 bonus for opponent ranked 1-10', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 5)

      expect(result.ranked10Bonus).toBe(2)
      expect(result.ranked25Bonus).toBe(0)
    })

    it('awards ranked_10 bonus for opponent ranked exactly 10', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 10)

      expect(result.ranked10Bonus).toBe(2)
      expect(result.ranked25Bonus).toBe(0)
    })

    it('awards ranked_25 bonus for opponent ranked 11-25', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 15)

      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(1)
    })

    it('awards ranked_25 bonus for opponent ranked exactly 25', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 25)

      expect(result.ranked25Bonus).toBe(1)
    })

    it('awards ranked_25 bonus for opponent ranked exactly 11', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 11)

      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(1)
    })

    it('does NOT award ranked bonus for opponent ranked 26+', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 26)

      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(0)
    })

    it('does NOT award ranked bonus when opponentRank is null', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(0)
    })

    it('awards ranked loss bonus with custom scoring', () => {
      const game = makeGame({ home_score: 14, away_score: 28 })
      const result = calculateSchoolGamePoints(game, HOME, 3, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.ranked10Bonus).toBe(CUSTOM_SCORING.points_ranked_10_loss)
    })

    it('awards ranked_25 loss bonus with custom scoring', () => {
      const game = makeGame({ home_score: 14, away_score: 28 })
      const result = calculateSchoolGamePoints(game, HOME, 20, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.ranked25Bonus).toBe(CUSTOM_SCORING.points_ranked_25_loss)
    })

    it('ranked_1 gets ranked_10 bonus (not ranked_25)', () => {
      const game = makeGame()
      const result = calculateSchoolGamePoints(game, HOME, 1)

      expect(result.ranked10Bonus).toBe(2)
      expect(result.ranked25Bonus).toBe(0)
    })
  })

  // ━━━ Bowl games ━━━

  describe('bowl games', () => {
    it('awards win points but NO ranked bonus for bowl wins', () => {
      const game = makeGame({ is_bowl_game: true })
      const result = calculateSchoolGamePoints(game, HOME, 5, DEFAULT_SCORING, true)

      expect(result.basePoints).toBe(1)
      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(0)
    })

    it('awards over50 and shutout bonuses in bowl games', () => {
      const game = makeGame({
        is_bowl_game: true,
        home_score: 55,
        away_score: 0,
      })
      const result = calculateSchoolGamePoints(game, HOME, 5, DEFAULT_SCORING, true)

      expect(result.over50Bonus).toBe(1)
      expect(result.shutoutBonus).toBe(1)
      expect(result.ranked10Bonus).toBe(0)
      expect(result.conferenceBonus).toBe(0)
    })

    it('does NOT award conference bonus in bowl games even if flagged', () => {
      const game = makeGame({
        is_bowl_game: true,
        is_conference_game: true,
      })
      const result = calculateSchoolGamePoints(game, HOME, null, DEFAULT_SCORING, true)

      expect(result.conferenceBonus).toBe(0)
    })
  })

  // ━━━ Playoff games ━━━

  describe('playoff games', () => {
    it('awards ranked_10 bonus for playoff opponent ranked ≤ 12', () => {
      const game = makeGame({ is_playoff_game: true })
      const result = calculateSchoolGamePoints(game, HOME, 8)

      expect(result.ranked10Bonus).toBe(2)
    })

    it('awards ranked_10 bonus for playoff opponent ranked exactly 12', () => {
      const game = makeGame({ is_playoff_game: true })
      const result = calculateSchoolGamePoints(game, HOME, 12)

      expect(result.ranked10Bonus).toBe(2)
    })

    it('does NOT award ranked bonus for playoff opponent ranked 13+', () => {
      const game = makeGame({ is_playoff_game: true })
      const result = calculateSchoolGamePoints(game, HOME, 13)

      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(0)
    })

    it('does NOT award conference bonus in playoffs', () => {
      const game = makeGame({
        is_playoff_game: true,
        is_conference_game: true,
      })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.conferenceBonus).toBe(0)
    })

    it('awards over50 and shutout in playoffs', () => {
      const game = makeGame({
        is_playoff_game: true,
        home_score: 52,
        away_score: 0,
      })
      const result = calculateSchoolGamePoints(game, HOME, null)

      expect(result.over50Bonus).toBe(1)
      expect(result.shutoutBonus).toBe(1)
    })

    it('awards ranked loss bonus in playoffs with custom scoring', () => {
      const game = makeGame({
        is_playoff_game: true,
        home_score: 14,
        away_score: 28,
      })
      const result = calculateSchoolGamePoints(game, HOME, 4, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.ranked10Bonus).toBe(CUSTOM_SCORING.points_ranked_10_loss)
    })
  })

  // ━━━ Championship game ━━━

  describe('championship game', () => {
    it('returns all zeros for championship winner', () => {
      const game = makeGame({
        is_playoff_game: true,
        playoff_round: 'championship',
        home_score: 35,
        away_score: 28,
      })
      const result = calculateSchoolGamePoints(game, HOME, 1)

      expect(result.isWin).toBe(true)
      expect(result.basePoints).toBe(0)
      expect(result.conferenceBonus).toBe(0)
      expect(result.over50Bonus).toBe(0)
      expect(result.shutoutBonus).toBe(0)
      expect(result.ranked10Bonus).toBe(0)
      expect(result.ranked25Bonus).toBe(0)
      expect(result.totalPoints).toBe(0)
    })

    it('returns all zeros for championship loser', () => {
      const game = makeGame({
        is_playoff_game: true,
        playoff_round: 'championship',
        home_score: 28,
        away_score: 35,
      })
      const result = calculateSchoolGamePoints(game, HOME, 1, CUSTOM_SCORING)

      expect(result.isWin).toBe(false)
      expect(result.totalPoints).toBe(0)
    })

    it('returns all zeros even with 50+ score in championship', () => {
      const game = makeGame({
        is_playoff_game: true,
        playoff_round: 'championship',
        home_score: 55,
        away_score: 0,
      })
      const result = calculateSchoolGamePoints(game, HOME, 1)

      expect(result.totalPoints).toBe(0)
    })
  })

  // ━━━ Total points aggregation ━━━

  describe('total points', () => {
    it('sums all bonuses for a max regular season win', () => {
      const game = makeGame({
        is_conference_game: true,
        home_score: 55,
        away_score: 0,
      })
      const result = calculateSchoolGamePoints(game, HOME, 3)

      // win(1) + conference(1) + over50(1) + shutout(1) + ranked10(2) = 6
      expect(result.basePoints).toBe(1)
      expect(result.conferenceBonus).toBe(1)
      expect(result.over50Bonus).toBe(1)
      expect(result.shutoutBonus).toBe(1)
      expect(result.ranked10Bonus).toBe(2)
      expect(result.ranked25Bonus).toBe(0)
      expect(result.totalPoints).toBe(6)
    })

    it('sums all bonuses with custom scoring', () => {
      const game = makeGame({
        is_conference_game: true,
        home_score: 55,
        away_score: 0,
      })
      const result = calculateSchoolGamePoints(game, HOME, 3, CUSTOM_SCORING)

      // win(3) + conference(2) + over50(2) + shutout(3) + ranked10(4) = 14
      expect(result.totalPoints).toBe(14)
    })

    it('sums loss bonuses with custom scoring', () => {
      const game = makeGame({
        is_conference_game: true,
        home_score: 10,
        away_score: 55,
      })
      const result = calculateSchoolGamePoints(game, HOME, 3, CUSTOM_SCORING)

      // loss(1) + conf_loss(1) + ranked10_loss(2) = 4
      // over50 is based on team score (10), shutout checks opponent score (55 != 0)
      expect(result.basePoints).toBe(1)
      expect(result.conferenceBonus).toBe(1)
      expect(result.over50Bonus).toBe(0)
      expect(result.shutoutBonus).toBe(0)
      expect(result.ranked10Bonus).toBe(2)
      expect(result.totalPoints).toBe(4)
    })
  })

  // ━━━ Return value metadata ━━━

  describe('metadata', () => {
    it('populates schoolId, gameId, seasonId, weekNumber', () => {
      const game = makeGame({
        id: 'g-123',
        season_id: 's-456',
        week_number: 12,
      })
      const result = calculateSchoolGamePoints(game, 'school-x', null)

      expect(result.schoolId).toBe('school-x')
      expect(result.gameId).toBe('g-123')
      expect(result.seasonId).toBe('s-456')
      expect(result.weekNumber).toBe(12)
    })
  })

  // ━━━ DEFAULT_SCORING constant ━━━

  describe('DEFAULT_SCORING', () => {
    it('has expected default values', () => {
      expect(DEFAULT_SCORING.points_win).toBe(1)
      expect(DEFAULT_SCORING.points_conference_game).toBe(1)
      expect(DEFAULT_SCORING.points_over_50).toBe(1)
      expect(DEFAULT_SCORING.points_shutout).toBe(1)
      expect(DEFAULT_SCORING.points_ranked_25).toBe(1)
      expect(DEFAULT_SCORING.points_ranked_10).toBe(2)
      expect(DEFAULT_SCORING.points_loss).toBe(0)
      expect(DEFAULT_SCORING.points_conference_game_loss).toBe(0)
      expect(DEFAULT_SCORING.points_over_50_loss).toBe(0)
      expect(DEFAULT_SCORING.points_shutout_loss).toBe(0)
      expect(DEFAULT_SCORING.points_ranked_25_loss).toBe(0)
      expect(DEFAULT_SCORING.points_ranked_10_loss).toBe(0)
    })
  })
})
