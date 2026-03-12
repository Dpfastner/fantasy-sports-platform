'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { track } from '@vercel/analytics'
import { formatGolfScore } from '@/lib/events/shared'
import { createClient } from '@/lib/supabase/client'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface DraftOrder {
  id: string
  entry_id: string
  round: number
  pick_number: number
  position_in_round: number
}

interface DraftPick {
  entry_id: string
  participant_id: string
  picked_at: string
}

interface DraftState {
  id: string
  pool_id: string
  status: 'not_started' | 'in_progress' | 'paused' | 'completed'
  current_round: number
  current_pick: number
  current_entry_id: string | null
  pick_deadline: string | null
  started_at: string | null
  completed_at: string | null
}

interface EntryInfo {
  id: string
  displayName: string
}

interface RosterDraftRoomProps {
  poolId: string
  tournamentId: string
  participants: Participant[]
  entries: EntryInfo[]
  userEntryId: string | null
  isCreator: boolean
  scoringRules: Record<string, unknown>
}

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-success/10', text: 'text-success-text' },
  B: { bg: 'bg-info/10', text: 'text-info-text' },
  C: { bg: 'bg-warning/10', text: 'text-warning-text' },
}

function getTierForOwgr(owgr: number, tiers: Record<string, { owgr_min: number; owgr_max?: number }>): string {
  for (const [key, tier] of Object.entries(tiers)) {
    const inMin = owgr >= tier.owgr_min
    const inMax = tier.owgr_max ? owgr <= tier.owgr_max : true
    if (inMin && inMax) return key
  }
  return '?'
}

export function RosterDraftRoom({
  poolId,
  tournamentId,
  participants,
  entries,
  userEntryId,
  isCreator,
  scoringRules,
}: RosterDraftRoomProps) {
  const { addToast } = useToast()
  const router = useRouter()

  const [draft, setDraft] = useState<DraftState | null>(null)
  const [order, setOrder] = useState<DraftOrder[]>([])
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const tiers = useMemo(() => {
    const t = scoringRules.tiers as Record<string, { count: number; owgr_min: number; owgr_max?: number }> | undefined
    return t || { A: { count: 2, owgr_min: 1, owgr_max: 15 }, B: { count: 2, owgr_min: 16, owgr_max: 30 }, C: { count: 3, owgr_min: 31 } }
  }, [scoringRules])

  const entryMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const e of entries) map[e.id] = e.displayName
    return map
  }, [entries])

  // Fetch draft state
  const fetchDraft = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/pools/${poolId}/draft`)
      if (!res.ok) {
        setIsLoading(false)
        return
      }
      const data = await res.json()
      setDraft(data.draft)
      setOrder(data.order || [])
      setPicks(data.picks || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [poolId])

  useEffect(() => {
    fetchDraft()
  }, [fetchDraft])

  // Real-time subscription for draft updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`draft-${poolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_pool_drafts', filter: `pool_id=eq.${poolId}` },
        (payload) => {
          if (payload.new) {
            setDraft(payload.new as DraftState)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_picks' },
        () => {
          // Refetch picks on any new pick
          fetchDraft()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [poolId, fetchDraft])

  // Countdown timer
  useEffect(() => {
    if (!draft?.pick_deadline || draft.status !== 'in_progress') {
      setCountdown(null)
      return
    }

    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(draft.pick_deadline!).getTime() - Date.now()) / 1000))
      setCountdown(remaining)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [draft?.pick_deadline, draft?.status])

  // Derived state
  const pickedParticipantIds = useMemo(
    () => new Set(picks.map(p => p.participant_id)),
    [picks]
  )

  const isMyTurn = draft?.status === 'in_progress' && draft.current_entry_id === userEntryId
  const currentEntryName = draft?.current_entry_id ? (entryMap[draft.current_entry_id] || 'Unknown') : null

  // Pick history with names
  const pickHistory = useMemo(() => {
    return picks.map(p => {
      const participant = participants.find(pt => pt.id === p.participant_id)
      const owgr = (participant?.metadata?.owgr as number) ?? (participant?.seed ?? 999)
      return {
        ...p,
        participantName: participant?.name || 'Unknown',
        entryName: entryMap[p.entry_id] || 'Unknown',
        tier: getTierForOwgr(owgr, tiers),
      }
    })
  }, [picks, participants, entryMap, tiers])

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setIsActing(true)
    try {
      const res = await fetch(`/api/events/pools/${poolId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || `Failed to ${action}`, 'error')
        return
      }

      if (action === 'start') {
        addToast('Draft started!', 'success')
        track('event_draft_started', { poolId })
      } else if (action === 'pick') {
        addToast(`Picked ${data.participantName}!`, 'success')
        if (data.isComplete) {
          addToast('Draft complete!', 'success')
        }
      }

      fetchDraft()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsActing(false)
    }
  }

  const handlePick = (participantId: string) => {
    if (!isMyTurn || !draft || !userEntryId) return
    handleAction('pick', {
      entryId: userEntryId,
      participantId,
      pickNumber: draft.current_pick,
    })
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-lg border border-border p-8 text-center">
        <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
        <p className="text-text-muted text-sm">Loading draft...</p>
      </div>
    )
  }

  // Not started
  if (!draft || draft.status === 'not_started') {
    return (
      <div className="bg-surface rounded-lg border border-border p-6 text-center">
        <h3 className="brand-h3 text-lg text-text-primary mb-2">Live Draft</h3>
        <p className="text-text-muted text-sm mb-4">
          {entries.length} entries ready. {isCreator ? 'Start the draft when everyone has joined.' : 'Waiting for the pool creator to start the draft.'}
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {entries.map(e => (
            <span key={e.id} className={`text-xs px-2 py-1 rounded-full border ${
              e.id === userEntryId ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted'
            }`}>
              {e.displayName}
            </span>
          ))}
        </div>
        {isCreator && (
          <button
            onClick={() => handleAction('start')}
            disabled={isActing || entries.length < 2}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:bg-brand/50 disabled:cursor-not-allowed"
          >
            {isActing ? 'Starting...' : 'Start Draft'}
          </button>
        )}
      </div>
    )
  }

  // Completed
  if (draft.status === 'completed') {
    return (
      <div className="space-y-4">
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
          <h3 className="brand-h3 text-lg text-success-text mb-1">Draft Complete</h3>
          <p className="text-text-muted text-sm">All rosters have been filled.</p>
        </div>

        {/* Draft results by entry */}
        <div className="space-y-3">
          {entries.map(entry => {
            const entryPicks = pickHistory.filter(p => p.entry_id === entry.id)
            return (
              <div key={entry.id} className={`bg-surface rounded-lg border p-4 ${
                entry.id === userEntryId ? 'border-brand' : 'border-border'
              }`}>
                <h4 className="text-sm font-medium text-text-primary mb-2">
                  {entry.displayName}
                  {entry.id === userEntryId && <span className="text-xs text-brand ml-1">(You)</span>}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {entryPicks.map(p => {
                    const colors = TIER_COLORS[p.tier] || TIER_COLORS.C
                    return (
                      <span key={p.participant_id} className={`text-xs px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
                        {p.participantName}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => router.refresh()}
          className="w-full py-2.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-brand/40 transition-colors"
        >
          View Rosters
        </button>
      </div>
    )
  }

  // In progress or paused
  return (
    <div className="space-y-4">
      {/* Draft status header */}
      <div className={`rounded-lg border p-4 ${
        draft.status === 'paused'
          ? 'bg-warning/10 border-warning/20'
          : isMyTurn
            ? 'bg-brand/5 border-brand/20'
            : 'bg-surface border-border'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-text-primary">
              Round {draft.current_round} — Pick {draft.current_pick}
            </span>
            {draft.status === 'paused' && (
              <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-warning/20 text-warning-text">PAUSED</span>
            )}
          </div>
          {countdown !== null && draft.status === 'in_progress' && (
            <span className={`text-lg font-mono font-bold ${countdown <= 10 ? 'text-danger-text' : 'text-text-primary'}`}>
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>

        {draft.status === 'in_progress' && (
          <p className="text-sm text-text-secondary">
            {isMyTurn ? (
              <span className="text-brand font-medium">Your turn to pick!</span>
            ) : (
              <>Waiting for <span className="font-medium text-text-primary">{currentEntryName}</span> to pick...</>
            )}
          </p>
        )}

        {/* Creator controls */}
        {isCreator && (
          <div className="flex gap-2 mt-3">
            {draft.status === 'in_progress' && (
              <button
                onClick={() => handleAction('pause')}
                disabled={isActing}
                className="text-xs px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-brand/40 transition-colors"
              >
                Pause Draft
              </button>
            )}
            {draft.status === 'paused' && (
              <button
                onClick={() => handleAction('resume')}
                disabled={isActing}
                className="text-xs px-3 py-1.5 rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors"
              >
                Resume Draft
              </button>
            )}
          </div>
        )}
      </div>

      {/* Draft order tracker */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-xs text-text-muted uppercase tracking-wide mb-2">Draft Order</h4>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {order.slice(0, Math.min(order.length, draft.current_pick + 8)).map(slot => {
            const isPast = slot.pick_number < draft.current_pick
            const isCurrent = slot.pick_number === draft.current_pick
            const pick = picks.find(p => p.entry_id === slot.entry_id && pickHistory.findIndex(ph => ph.entry_id === slot.entry_id) !== -1)
            const slotPick = pickHistory[slot.pick_number - 1]

            return (
              <div
                key={slot.pick_number}
                className={`shrink-0 text-center px-2 py-1.5 rounded-md border text-xs min-w-[4rem] ${
                  isCurrent ? 'border-brand bg-brand/10 text-brand font-medium' :
                  isPast ? 'border-border bg-surface-inset text-text-muted' :
                  'border-border text-text-muted'
                }`}
              >
                <div className="text-[10px] text-text-muted">R{slot.round}#{slot.position_in_round}</div>
                <div className="truncate">{entryMap[slot.entry_id]?.split(' ')[0] || '?'}</div>
                {isPast && slotPick && (
                  <div className="text-[10px] truncate mt-0.5">{slotPick.participantName.split(' ').pop()}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Available golfers (only shown when it's your turn or for viewing) */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h4 className="text-xs text-text-muted uppercase tracking-wide mb-3">
          {isMyTurn ? 'Select a golfer' : 'Available golfers'}
        </h4>

        {Object.entries(tiers).sort().map(([tierKey, tierDef]) => {
          const tierParticipants = participants.filter(p => {
            const owgr = (p.metadata?.owgr as number) ?? (p.seed ?? 999)
            return owgr >= tierDef.owgr_min && (tierDef.owgr_max ? owgr <= tierDef.owgr_max : true)
          }).sort((a, b) => {
            const aOwgr = (a.metadata?.owgr as number) ?? (a.seed ?? 999)
            const bOwgr = (b.metadata?.owgr as number) ?? (b.seed ?? 999)
            return aOwgr - bOwgr
          })

          const colors = TIER_COLORS[tierKey] || TIER_COLORS.C

          return (
            <div key={tierKey} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                  Tier {tierKey}
                </span>
                <span className="text-xs text-text-muted">
                  OWGR {tierDef.owgr_min}{tierDef.owgr_max ? `–${tierDef.owgr_max}` : '+'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {tierParticipants.map(p => {
                  const isPicked = pickedParticipantIds.has(p.id)
                  const meta = (p.metadata || {}) as Record<string, unknown>
                  const owgr = (meta.owgr as number) ?? p.seed
                  const scoreToPar = meta.score_to_par as number | null

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePick(p.id)}
                      disabled={isPicked || !isMyTurn || isActing || draft.status !== 'in_progress'}
                      className={`text-left rounded-md border p-2.5 text-sm transition-all ${
                        isPicked
                          ? 'border-border bg-surface-inset opacity-40 cursor-not-allowed line-through'
                          : isMyTurn
                            ? 'border-border hover:border-brand/40 hover:shadow-md cursor-pointer bg-surface'
                            : 'border-border bg-surface cursor-default'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-text-primary font-medium truncate block">{p.name}</span>
                          {owgr && <span className="text-xs text-text-muted">#{owgr}</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isPicked && (
                            <span className="text-[10px] text-text-muted">
                              {entryMap[picks.find(pk => pk.participant_id === p.id)?.entry_id || ''] || 'Taken'}
                            </span>
                          )}
                          {scoreToPar != null && (
                            <span className="text-xs font-medium text-text-secondary">{formatGolfScore(scoreToPar)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pick log */}
      {pickHistory.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-4">
          <h4 className="text-xs text-text-muted uppercase tracking-wide mb-2">Pick Log</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...pickHistory].reverse().map((p, i) => {
              const colors = TIER_COLORS[p.tier] || TIER_COLORS.C
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-text-secondary py-1">
                  <span className="text-text-muted w-6 text-right">#{pickHistory.length - i}</span>
                  <span className="font-medium text-text-primary">{p.entryName}</span>
                  <span className="text-text-muted">picked</span>
                  <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{p.participantName}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
