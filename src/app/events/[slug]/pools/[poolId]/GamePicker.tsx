'use client'

import { BracketPicker } from './BracketPicker'
import { SurvivorPicker } from './SurvivorPicker'
import { PickemPicker } from './PickemPicker'
import { RosterPicker } from './RosterPicker'
import { RosterDraftRoom } from './RosterDraftRoom'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
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
  period?: string | null
  clock?: string | null
  liveStatus?: string | null
  winnerId?: string | null
}

interface UserPick {
  id: string
  gameId: string | null
  participantId: string
  weekNumber: number | null
}

interface PoolWeek {
  id: string
  week_number: number
  deadline: string
  resolution_status: string
}

interface GamePickerProps {
  format: string
  pool: {
    id: string
    status: string
    tiebreaker: string
    scoringRules: Record<string, unknown>
    deadline: string | null
  }
  tournament: { id: string }
  activeEntry: {
    id: string
    isActive: boolean
    submittedAt: string | null
    tiebreakerPrediction: { team1_score: number; team2_score: number } | null
    displayName?: string | null
  }
  participants: Participant[]
  games: Game[]
  existingPicks: UserPick[]
  poolWeeks: PoolWeek[]
  members: { id: string; displayName: string }[]
  isCreator: boolean
  rosterSelectionCounts?: Record<string, number>
  rosterTotalEntries?: number
}

export function GamePicker({
  format,
  pool,
  tournament,
  activeEntry,
  participants,
  games,
  existingPicks,
  poolWeeks,
  members,
  isCreator,
  rosterSelectionCounts,
  rosterTotalEntries,
}: GamePickerProps) {
  if (format === 'bracket') {
    return (
      <BracketPicker
        entryId={activeEntry.id}
        tournamentId={tournament.id}
        poolId={pool.id}
        poolStatus={pool.status}
        games={games}
        participants={participants}
        existingPicks={existingPicks}
        tiebreakerType={pool.tiebreaker}
        existingTiebreaker={activeEntry.tiebreakerPrediction}
        submittedAt={activeEntry.submittedAt}
        scoringRules={pool.scoringRules}
        existingDisplayName={activeEntry.displayName}
      />
    )
  }

  if (format === 'survivor') {
    return (
      <SurvivorPicker
        entryId={activeEntry.id}
        tournamentId={tournament.id}
        poolId={pool.id}
        poolStatus={pool.status}
        participants={participants}
        existingPicks={existingPicks}
        poolWeeks={poolWeeks}
        isActive={activeEntry.isActive}
        games={games}
        existingDisplayName={activeEntry.displayName}
      />
    )
  }

  if (format === 'pickem') {
    return (
      <PickemPicker
        entryId={activeEntry.id}
        tournamentId={tournament.id}
        poolId={pool.id}
        poolStatus={pool.status}
        games={games}
        participants={participants}
        existingPicks={existingPicks}
        submittedAt={activeEntry.submittedAt}
        existingDisplayName={activeEntry.displayName}
      />
    )
  }

  if (format === 'roster') {
    const draftMode = (pool.scoringRules?.draft_mode as string) || 'open'
    if (draftMode === 'snake_draft' || draftMode === 'linear_draft') {
      return (
        <RosterDraftRoom
          poolId={pool.id}
          tournamentId={tournament.id}
          participants={participants}
          entries={members.map(m => ({ id: m.id, displayName: m.displayName }))}
          userEntryId={activeEntry.id}
          isCreator={isCreator}
          scoringRules={pool.scoringRules}
        />
      )
    }
    return (
      <RosterPicker
        entryId={activeEntry.id}
        tournamentId={tournament.id}
        poolId={pool.id}
        poolStatus={pool.status}
        participants={participants}
        existingPicks={existingPicks}
        submittedAt={activeEntry.submittedAt}
        scoringRules={pool.scoringRules}
        deadline={pool.deadline}
        selectionCounts={rosterSelectionCounts}
        totalEntries={rosterTotalEntries}
        existingDisplayName={activeEntry.displayName}
      />
    )
  }

  return null
}
