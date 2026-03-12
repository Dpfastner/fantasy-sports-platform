import { useState, useMemo, useCallback } from 'react'
import { buildBracketMap, getDownstreamGameIds, type BracketMap } from './bracketUtils'

interface Game {
  id: string
  gameNumber: number
  round: string
  participant1Id: string | null
  participant2Id: string | null
  status: string
  winnerId?: string | null
}

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
}

interface ExistingPick {
  gameId: string | null
  participantId: string
}

interface UseBracketPicksParams {
  games: Game[]
  participants: Participant[]
  existingPicks: ExistingPick[]
  isLocked: boolean
}

export interface SlotResult {
  participant: Participant | null
  eliminated: boolean
}

export function useBracketPicks({ games, participants, existingPicks, isLocked }: UseBracketPicksParams) {
  const participantMap = useMemo(() => {
    const m: Record<string, Participant> = {}
    for (const p of participants) m[p.id] = p
    return m
  }, [participants])

  const bracketMap: BracketMap = useMemo(
    () => buildBracketMap(games),
    [games],
  )

  // Initialize picks from existing saved picks
  const initialPicks = useMemo(() => {
    const p: Record<string, string> = {}
    for (const pick of existingPicks) {
      if (pick.gameId) p[pick.gameId] = pick.participantId
    }
    return p
  }, [existingPicks])

  const [picks, setPicks] = useState<Record<string, string>>(initialPicks)

  /**
   * Get the participant for a game slot.
   * First-round: use DB-assigned participants.
   * Later rounds: show the user's pick (even if eliminated) so
   * the bracket always reflects what the user originally chose.
   * The `eliminated` flag lets the UI render strikethrough styling.
   */
  const getParticipantForSlot = useCallback(
    (gameId: string, slot: 1 | 2): SlotResult => {
      const game = games.find(g => g.id === gameId)
      if (!game) return { participant: null, eliminated: false }

      const feed = bracketMap[gameId]
      if (!feed || feed.feedsFrom.length === 0) {
        // First round — use DB participants
        const pid = slot === 1 ? game.participant1Id : game.participant2Id
        return { participant: pid ? participantMap[pid] || null : null, eliminated: false }
      }

      // Later round — resolve from feeder game
      const feederGameId = feed.feedsFrom[slot - 1]
      const feederGame = games.find(g => g.id === feederGameId)
      const feederComplete = feederGame && (feederGame.status === 'completed' || feederGame.status === 'final') && feederGame.winnerId
      const pickedId = picks[feederGameId]

      if (feederComplete) {
        if (pickedId && pickedId !== feederGame.winnerId) {
          // User picked the LOSER — show their pick but mark as eliminated
          return { participant: participantMap[pickedId] || null, eliminated: true }
        }
        // User picked the winner, or no pick — show actual winner
        return { participant: participantMap[feederGame.winnerId!] || null, eliminated: false }
      }

      // Feeder not completed — show user's pick (or null for TBD)
      return { participant: pickedId ? participantMap[pickedId] || null : null, eliminated: false }
    },
    [games, bracketMap, participantMap, picks],
  )

  /**
   * Handle a pick. If changing a previous pick, cascade-clear
   * downstream picks that depended on the old team.
   */
  const handlePick = useCallback(
    (gameId: string, participantId: string) => {
      if (isLocked) return

      setPicks(prev => {
        const newPicks = { ...prev }
        const oldPick = prev[gameId]

        // Toggle off if same pick
        if (oldPick === participantId) {
          delete newPicks[gameId]
          // Clear downstream picks that depended on this team
          const downstream = getDownstreamGameIds(gameId, bracketMap)
          for (const dId of downstream) {
            if (newPicks[dId] === participantId) {
              delete newPicks[dId]
            }
          }
          return newPicks
        }

        // Set new pick
        newPicks[gameId] = participantId

        // If changing an existing pick, clear downstream that used the OLD team
        if (oldPick) {
          const downstream = getDownstreamGameIds(gameId, bracketMap)
          for (const dId of downstream) {
            if (newPicks[dId] === oldPick) {
              delete newPicks[dId]
            }
          }
        }

        return newPicks
      })
    },
    [isLocked, bracketMap],
  )

  const isDirty = useMemo(() => {
    const savedKeys = new Set(existingPicks.filter(p => p.gameId).map(p => p.gameId!))
    const pickKeys = new Set(Object.keys(picks))
    if (savedKeys.size !== pickKeys.size) return true
    for (const key of savedKeys) {
      const savedPick = existingPicks.find(p => p.gameId === key)
      if (!savedPick || picks[key] !== savedPick.participantId) return true
    }
    return true // default to dirty if picks exist (safer)
  }, [picks, existingPicks])

  const totalGames = games.length
  const pickedCount = Object.keys(picks).length
  const allPicksMade = pickedCount === totalGames

  return {
    picks,
    bracketMap,
    participantMap,
    handlePick,
    getParticipantForSlot,
    isDirty,
    allPicksMade,
    pickedCount,
    totalGames,
  }
}
