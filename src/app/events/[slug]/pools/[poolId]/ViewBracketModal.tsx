'use client'

import { useState, useEffect, useMemo } from 'react'
import { BracketGrid } from './BracketGrid'
import { BracketList } from './BracketList'
import { buildBracketMap } from './bracketUtils'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
}

interface Game {
  id: string
  round: string
  gameNumber: number
  participant1Id: string | null
  participant2Id: string | null
  participant1Score?: number | null
  participant2Score?: number | null
  startsAt: string
  status: string
  result: Record<string, unknown> | null
  winnerId?: string | null
  period?: string | null
  clock?: string | null
}

interface ViewBracketModalProps {
  entryId: string
  entryName: string
  games: Game[]
  participants: Participant[]
  scoringRules: Record<string, number>
  tiebreakerPrediction?: { team1_score: number; team2_score: number } | null
  score?: number
  onClose: () => void
}

export function ViewBracketModal({
  entryId,
  entryName,
  games,
  participants,
  scoringRules,
  tiebreakerPrediction,
  score,
  onClose,
}: ViewBracketModalProps) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const bracketMap = useMemo(() => buildBracketMap(
    games.map(g => ({ id: g.id, gameNumber: g.gameNumber, round: g.round, participant1Id: g.participant1Id, participant2Id: g.participant2Id }))
  ), [games])

  useEffect(() => {
    async function loadPicks() {
      try {
        const res = await fetch(`/api/events/picks?entryId=${entryId}`)
        const data = await res.json()
        if (data.picks) {
          const pickMap: Record<string, string> = {}
          for (const p of data.picks) {
            if (p.game_id) pickMap[p.game_id] = p.participant_id
          }
          setPicks(pickMap)
        }
      } catch {
        // Failed to load picks
      } finally {
        setLoading(false)
      }
    }
    loadPicks()
  }, [entryId])

  const getParticipantForSlot = (gameId: string, slot: 1 | 2) => {
    const game = games.find(g => g.id === gameId)
    if (!game) return { participant: null, eliminated: false }

    const feed = bracketMap[gameId]
    if (!feed || feed.feedsFrom.length === 0) {
      const pid = slot === 1 ? game.participant1Id : game.participant2Id
      const participant = pid ? participants.find(p => p.id === pid) || null : null
      return { participant, eliminated: false }
    }

    const feederGameId = feed.feedsFrom[slot - 1]
    const pickedId = feederGameId ? picks[feederGameId] : null
    const participant = pickedId ? participants.find(p => p.id === pickedId) || null : null
    return { participant, eliminated: false }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-5xl mt-8 mb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{entryName}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              {score != null && (
                <span className="text-sm text-brand font-medium">{score} pts</span>
              )}
              {tiebreakerPrediction && (
                <span className="text-xs text-text-muted">
                  Tiebreaker: {tiebreakerPrediction.team1_score} - {tiebreakerPrediction.team2_score} total goals
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Bracket */}
        <div className="p-4">
          {loading ? (
            <div className="text-center text-text-muted py-8">Loading bracket...</div>
          ) : Object.keys(picks).length === 0 ? (
            <div className="text-center text-text-muted py-8">No picks submitted yet.</div>
          ) : (
            <>
              <div className="hidden md:block">
                <BracketGrid
                  games={games}
                  participants={participants}
                  picks={picks}
                  bracketMap={bracketMap}
                  scoringRules={scoringRules}
                  isLocked={true}
                  onPick={() => {}}
                  getParticipantForSlot={getParticipantForSlot}
                />
              </div>
              <div className="block md:hidden">
                <BracketList
                  games={games}
                  picks={picks}
                  bracketMap={bracketMap}
                  scoringRules={scoringRules}
                  isLocked={true}
                  onPick={() => {}}
                  getParticipantForSlot={getParticipantForSlot}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
