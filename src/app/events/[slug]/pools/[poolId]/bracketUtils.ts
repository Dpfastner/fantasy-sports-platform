/**
 * Pure utility functions for bracket topology, layout positioning, and cascade logic.
 * No React dependencies — can be tested independently.
 */

interface BracketGame {
  id: string
  gameNumber: number
  round: string
  participant1Id: string | null
  participant2Id: string | null
}

export interface FeedInfo {
  feedsFrom: [string, string] | [] // gameIds of the two feeder games (empty for first round)
  feedsInto: string | null          // gameId this game feeds into
  slot: 1 | 2 | null               // which slot (1 or 2) in the target game
}

export type BracketMap = Record<string, FeedInfo>

/**
 * Build a feed map from game data. Derives the bracket topology from
 * gameNumber ordering — no hardcoded game numbers.
 *
 * Algorithm: sort by gameNumber, group by round in order. For each round
 * after the first, the i-th game's feeders are games[2i] and games[2i+1]
 * from the previous round.
 */
export function buildBracketMap(games: BracketGame[]): BracketMap {
  const sorted = [...games].sort((a, b) => a.gameNumber - b.gameNumber)

  // Group by round, preserving the order rounds appear
  const roundOrder: string[] = []
  const roundGames: Record<string, BracketGame[]> = {}
  for (const g of sorted) {
    if (!roundGames[g.round]) {
      roundOrder.push(g.round)
      roundGames[g.round] = []
    }
    roundGames[g.round].push(g)
  }

  const map: BracketMap = {}

  // First round: no feeders
  const firstRound = roundOrder[0]
  if (firstRound) {
    for (const g of roundGames[firstRound]) {
      map[g.id] = { feedsFrom: [], feedsInto: null, slot: null }
    }
  }

  // Subsequent rounds: pair up previous round's games
  for (let r = 1; r < roundOrder.length; r++) {
    const prevGames = roundGames[roundOrder[r - 1]]
    const currGames = roundGames[roundOrder[r]]

    for (let i = 0; i < currGames.length; i++) {
      const feeder1 = prevGames[i * 2]
      const feeder2 = prevGames[i * 2 + 1]
      const curr = currGames[i]

      map[curr.id] = {
        feedsFrom: feeder1 && feeder2 ? [feeder1.id, feeder2.id] : [],
        feedsInto: null,
        slot: null,
      }

      // Update feeders to point to this game
      if (feeder1 && map[feeder1.id]) {
        map[feeder1.id].feedsInto = curr.id
        map[feeder1.id].slot = 1
      }
      if (feeder2 && map[feeder2.id]) {
        map[feeder2.id].feedsInto = curr.id
        map[feeder2.id].slot = 2
      }
    }
  }

  return map
}

/**
 * Get the ordered list of rounds with their games, sorted by bracket progression.
 */
export function getRounds(games: BracketGame[]): { round: string; games: BracketGame[] }[] {
  const sorted = [...games].sort((a, b) => a.gameNumber - b.gameNumber)
  const roundOrder: string[] = []
  const roundGames: Record<string, BracketGame[]> = {}

  for (const g of sorted) {
    if (!roundGames[g.round]) {
      roundOrder.push(g.round)
      roundGames[g.round] = []
    }
    roundGames[g.round].push(g)
  }

  return roundOrder.map(r => ({ round: r, games: roundGames[r] }))
}

/**
 * Get all downstream game IDs that depend on a given game's result.
 * Used for cascade clearing when a pick changes.
 */
export function getDownstreamGameIds(gameId: string, bracketMap: BracketMap): string[] {
  const result: string[] = []
  const feedsInto = bracketMap[gameId]?.feedsInto
  if (feedsInto) {
    result.push(feedsInto)
    result.push(...getDownstreamGameIds(feedsInto, bracketMap))
  }
  return result
}

// Layout constants
export const CARD_HEIGHT = 72
export const CARD_WIDTH = 200
export const PAIR_GAP = 8      // gap between two games in a pair
export const REGION_GAP = 32   // gap between regional pairs
export const CONNECTOR_WIDTH = 32

/**
 * Calculate the Y position for each game card in the bracket layout.
 * First round positions are evenly distributed. Later rounds center
 * between their feeder games.
 */
export function calculateCardPositions(
  rounds: { round: string; games: BracketGame[] }[],
  bracketMap: BracketMap,
): Record<string, number> {
  const positions: Record<string, number> = {}

  if (rounds.length === 0) return positions

  // First round: arrange in pairs with gaps
  const firstRound = rounds[0].games
  let y = 0
  for (let i = 0; i < firstRound.length; i++) {
    positions[firstRound[i].id] = y
    // Small gap within a pair, larger gap between pairs
    if (i % 2 === 0) {
      y += CARD_HEIGHT + PAIR_GAP
    } else {
      y += CARD_HEIGHT + REGION_GAP
    }
  }

  // Later rounds: center between feeder games
  for (let r = 1; r < rounds.length; r++) {
    for (const game of rounds[r].games) {
      const feed = bracketMap[game.id]
      if (feed.feedsFrom.length === 2) {
        const y1 = positions[feed.feedsFrom[0]]
        const y2 = positions[feed.feedsFrom[1]]
        // Center between the two feeder cards
        positions[game.id] = (y1 + y2) / 2
      }
    }
  }

  return positions
}

/**
 * Total height needed for the bracket layout.
 */
export function calculateBracketHeight(
  rounds: { round: string; games: BracketGame[] }[],
): number {
  const firstRound = rounds[0]?.games || []
  const pairCount = Math.ceil(firstRound.length / 2)
  return (
    firstRound.length * CARD_HEIGHT +
    (pairCount - 1) * REGION_GAP +
    pairCount * PAIR_GAP
  )
}
