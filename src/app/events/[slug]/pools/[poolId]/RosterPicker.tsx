'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { trackEventActivity } from '@/app/actions/activity'
import { track } from '@vercel/analytics'
import { formatGolfScore } from '@/lib/events/shared'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface UserPick {
  id: string
  gameId: string | null
  participantId: string
  weekNumber: number | null
}

interface TierConfig {
  count: number
  owgr_min: number
  owgr_max?: number
}

interface RosterPickerProps {
  entryId: string
  tournamentId: string
  poolId: string
  poolStatus: string
  participants: Participant[]
  existingPicks: UserPick[]
  submittedAt: string | null
  scoringRules: Record<string, unknown>
  deadline: string | null
  /** For limited mode: how many times each participant has been picked by OTHER entries */
  selectionCounts?: Record<string, number>
}

const DEFAULT_TIERS: Record<string, TierConfig> = {
  A: { count: 2, owgr_min: 1, owgr_max: 15 },
  B: { count: 2, owgr_min: 16, owgr_max: 30 },
  C: { count: 3, owgr_min: 31 },
}

function CountryFlag({ country, countryCode }: { country?: string; countryCode?: string }) {
  if (!countryCode) return null
  return (
    <img
      src={`https://flagcdn.com/24x18/${countryCode}.png`}
      alt={country || ''}
      title={country || ''}
      width={18}
      height={14}
      className="inline-block shrink-0 rounded-[2px]"
      loading="lazy"
    />
  )
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-success/10', text: 'text-success-text', border: 'border-success/30' },
  B: { bg: 'bg-info/10', text: 'text-info-text', border: 'border-info/30' },
  C: { bg: 'bg-warning/10', text: 'text-warning-text', border: 'border-warning/30' },
}

export function RosterPicker({
  entryId,
  tournamentId,
  poolId,
  poolStatus,
  participants,
  existingPicks,
  submittedAt,
  scoringRules,
  deadline,
  selectionCounts,
}: RosterPickerProps) {
  const { addToast } = useToast()
  const router = useRouter()

  // Parse tier config from scoring_rules or use defaults
  const tiers = useMemo(() => {
    const sr = scoringRules || {}
    const tierConfig = sr.tiers as Record<string, TierConfig> | undefined
    return tierConfig && Object.keys(tierConfig).length > 0 ? tierConfig : DEFAULT_TIERS
  }, [scoringRules])

  const rosterSize = useMemo(() => {
    const sr = scoringRules || {}
    return (sr.roster_size as number) || Object.values(tiers).reduce((sum, t) => sum + t.count, 0)
  }, [scoringRules, tiers])

  const countBest = useMemo(() => {
    const sr = scoringRules || {}
    return (sr.count_best as number) || 5
  }, [scoringRules])

  // Initialize selected picks from existing
  const existingPickIds = useMemo(
    () => new Set(existingPicks.filter(p => !p.gameId && p.weekNumber == null).map(p => p.participantId)),
    [existingPicks]
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(existingPickIds)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Group participants by tier based on OWGR
  const tierGroups = useMemo(() => {
    const groups: Record<string, Participant[]> = {}
    const sortedTierKeys = Object.keys(tiers).sort()

    for (const key of sortedTierKeys) {
      groups[key] = []
    }

    for (const p of participants) {
      const owgr = (p.metadata?.owgr as number) ?? (p.seed ?? 999)
      for (const [tierKey, tierDef] of Object.entries(tiers)) {
        const inMin = owgr >= tierDef.owgr_min
        const inMax = tierDef.owgr_max ? owgr <= tierDef.owgr_max : true
        if (inMin && inMax) {
          groups[tierKey] = groups[tierKey] || []
          groups[tierKey].push(p)
          break
        }
      }
    }

    // Sort each tier by OWGR
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const aOwgr = (a.metadata?.owgr as number) ?? (a.seed ?? 999)
        const bOwgr = (b.metadata?.owgr as number) ?? (b.seed ?? 999)
        return aOwgr - bOwgr
      })
    }

    return groups
  }, [participants, tiers])

  // Count selected per tier
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tierKey of Object.keys(tiers)) {
      const tierParticipants = tierGroups[tierKey] || []
      counts[tierKey] = tierParticipants.filter(p => selectedIds.has(p.id)).length
    }
    return counts
  }, [tiers, tierGroups, selectedIds])

  // Draft mode + selection cap
  const draftMode = (scoringRules?.draft_mode as string) || 'open'
  const selectionCap = (scoringRules?.selection_cap as number) || 0
  const isLimitedMode = draftMode === 'limited' && selectionCap > 0

  const isLocked = poolStatus !== 'open'
  const isDeadlinePassed = deadline ? new Date(deadline) < new Date() : false
  const canEdit = !isLocked && !isDeadlinePassed

  // Check if we have live score data
  const hasScores = participants.some(p => p.metadata?.score_to_par != null)

  const togglePick = (participantId: string, tierKey: string) => {
    if (!canEdit) return

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(participantId)) {
        next.delete(participantId)
      } else {
        // Check tier limit
        const tierCount = tierCounts[tierKey] || 0
        const tierLimit = tiers[tierKey]?.count || 0
        if (tierCount >= tierLimit) {
          addToast(`Tier ${tierKey} is full (${tierLimit} max)`, 'error')
          return prev
        }
        // Check selection cap (limited mode)
        if (isLimitedMode && selectionCounts) {
          const currentCount = selectionCounts[participantId] || 0
          if (currentCount >= selectionCap) {
            addToast(`This golfer has reached the selection cap (${selectionCap})`, 'error')
            return prev
          }
        }
        next.add(participantId)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    // Validate tier counts
    for (const [tierKey, tierDef] of Object.entries(tiers)) {
      const count = tierCounts[tierKey] || 0
      if (count !== tierDef.count) {
        addToast(`Select exactly ${tierDef.count} golfers from Tier ${tierKey} (have ${count})`, 'error')
        return
      }
    }

    if (selectedIds.size !== rosterSize) {
      addToast(`Select exactly ${rosterSize} golfers`, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const picks = Array.from(selectedIds).map(participantId => ({ participantId }))
      const res = await fetch('/api/events/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, picks }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to submit roster', 'error')
        return
      }

      addToast(submittedAt ? 'Roster updated!' : 'Roster submitted!', 'success')
      track('event_roster_submitted', { pickCount: picks.length })
      trackEventActivity('roster.submitted', poolId, tournamentId, { pickCount: picks.length })
      router.refresh()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build "My Roster" data — always available after submission (with or without live scores)
  const myRoster = useMemo(() => {
    if (selectedIds.size === 0) return null

    const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 }

    const pickedParticipants = participants
      .filter(p => selectedIds.has(p.id))
      .map(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        const owgr = (meta.owgr as number) ?? (p.seed ?? 999)
        // Determine tier from config
        let tier = (meta.tier as string) || '?'
        if (tier === '?') {
          for (const [tierKey, tierDef] of Object.entries(tiers)) {
            const inMin = owgr >= tierDef.owgr_min
            const inMax = tierDef.owgr_max ? owgr <= tierDef.owgr_max : true
            if (inMin && inMax) { tier = tierKey; break }
          }
        }
        return {
          id: p.id,
          name: p.name,
          tier,
          country: meta.country as string | undefined,
          countryCode: meta.country_code as string | undefined,
          scoreToPar: meta.score_to_par as number | null,
          r1: meta.r1 as number | null,
          r2: meta.r2 as number | null,
          r3: meta.r3 as number | null,
          r4: meta.r4 as number | null,
          status: (meta.status as string) || 'active',
          rank: owgr,
        }
      })

    // When live scores exist, sort by score (best first) for counting/dropped
    // When no scores, sort by tier then rank
    if (hasScores) {
      pickedParticipants.sort((a, b) => (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999))
    } else {
      pickedParticipants.sort((a, b) => {
        const tierDiff = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
        return tierDiff !== 0 ? tierDiff : a.rank - b.rank
      })
    }

    const counting = pickedParticipants.slice(0, countBest)
    const dropped = pickedParticipants.slice(countBest)
    const total = hasScores
      ? counting.reduce((sum, p) => sum + (p.scoreToPar ?? 0), 0)
      : null

    return { counting, dropped, total, hasScores }
  }, [selectedIds, participants, countBest, hasScores, tiers])

  return (
    <div>
      {/* Status bar */}
      <div className="bg-surface rounded-lg border border-border p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-sm text-text-primary font-medium">
            {selectedIds.size} / {rosterSize} golfers selected
          </span>
          {submittedAt && (
            <span className="text-xs text-text-muted ml-3">
              Last saved {new Date(submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedIds.size !== rosterSize}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:bg-brand/50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : submittedAt ? 'Update Roster' : 'Submit Roster'}
          </button>
        )}
      </div>

      {/* Locked warning */}
      {isLocked && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4 text-sm text-warning-text">
          Rosters are locked. {isDeadlinePassed ? 'The deadline has passed.' : 'The pool is no longer accepting changes.'}
        </div>
      )}

      {/* My Roster — always visible after submission */}
      {myRoster && submittedAt && (
        <div className="bg-surface rounded-lg border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="brand-h3 text-base text-text-primary">My Roster</h3>
            {myRoster.total != null ? (
              <span className="text-2xl font-bold text-brand">{formatGolfScore(myRoster.total)}</span>
            ) : (
              <span className="text-sm text-text-muted">Awaiting scores</span>
            )}
          </div>
          <p className="text-xs text-text-muted mb-3">
            Best {countBest} of {rosterSize} count
            {myRoster.hasScores && (
              <> &middot; {myRoster.counting.length} counting &middot; {myRoster.dropped.length} dropped</>
            )}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wide border-b border-border">
                  <th className="text-left py-2 pr-2">Golfer</th>
                  <th className="text-center py-2 px-1 w-10">Tier</th>
                  <th className="text-center py-2 px-1 w-10">R1</th>
                  <th className="text-center py-2 px-1 w-10">R2</th>
                  <th className="text-center py-2 px-1 w-10">R3</th>
                  <th className="text-center py-2 px-1 w-10">R4</th>
                  <th className="text-right py-2 pl-1 w-14">Total</th>
                </tr>
              </thead>
              <tbody>
                {myRoster.counting.map(p => (
                  <tr key={p.id} className="border-b border-border-subtle">
                    <td className="py-2 pr-2 text-text-primary">
                      <span className="flex items-center gap-1.5">
                        <CountryFlag country={p.country} countryCode={p.countryCode} />
                        {p.name}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                        {p.tier}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-center text-text-secondary">{p.r1 ?? '—'}</td>
                    <td className="py-2 px-1 text-center text-text-secondary">{p.r2 ?? '—'}</td>
                    <td className="py-2 px-1 text-center text-text-secondary">{p.r3 ?? '—'}</td>
                    <td className="py-2 px-1 text-center text-text-secondary">{p.r4 ?? '—'}</td>
                    <td className="py-2 pl-1 text-right font-medium text-text-primary">{formatGolfScore(p.scoreToPar)}</td>
                  </tr>
                ))}
                {myRoster.dropped.map(p => (
                  <tr key={p.id} className="border-b border-border-subtle opacity-50">
                    <td className="py-2 pr-2 text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <CountryFlag country={p.country} countryCode={p.countryCode} />
                        {p.name}
                        <span className="text-[10px] italic">dropped</span>
                      </span>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                        {p.tier}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-center text-text-muted">{p.r1 ?? '—'}</td>
                    <td className="py-2 px-1 text-center text-text-muted">{p.r2 ?? '—'}</td>
                    <td className="py-2 px-1 text-center text-text-muted">{p.r3 ?? '—'}</td>
                    <td className="py-2 px-1 text-center text-text-muted">{p.r4 ?? '—'}</td>
                    <td className="py-2 pl-1 text-right text-text-muted">{formatGolfScore(p.scoreToPar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tier sections */}
      <div className="space-y-6">
        {Object.entries(tiers).map(([tierKey, tierDef]) => {
          const tierParticipants = tierGroups[tierKey] || []
          const count = tierCounts[tierKey] || 0
          const isFull = count >= tierDef.count
          const colors = TIER_COLORS[tierKey] || TIER_COLORS.C

          return (
            <div key={tierKey}>
              {/* Tier header */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="brand-h3 text-base text-text-primary">
                  Tier {tierKey}
                </h3>
                <span className="text-xs text-text-muted">
                  Rank {tierDef.owgr_min}{tierDef.owgr_max ? `–${tierDef.owgr_max}` : '+'}
                </span>
                <span className="text-xs text-text-muted">—</span>
                <span className="text-xs text-text-muted">Pick {tierDef.count}</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  isFull ? 'bg-success/20 text-success-text' : 'bg-warning/20 text-warning-text'
                }`}>
                  {count}/{tierDef.count}
                </span>
              </div>

              {/* Golfer cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {tierParticipants.map(p => {
                  const isSelected = selectedIds.has(p.id)
                  const meta = (p.metadata || {}) as Record<string, unknown>
                  const owgr = (meta.owgr as number) ?? p.seed
                  const scoreToPar = meta.score_to_par as number | null
                  const status = (meta.status as string) || 'active'
                  const isCut = status === 'cut'
                  const country = meta.country as string | undefined
                  const countryCode = meta.country_code as string | undefined
                  const pickCount = isLimitedMode && selectionCounts ? (selectionCounts[p.id] || 0) : 0
                  const isAtCap = isLimitedMode && pickCount >= selectionCap

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePick(p.id, tierKey)}
                      disabled={(!canEdit && !isSelected) || (isAtCap && !isSelected)}
                      className={`bg-surface rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? `border-brand bg-brand/5 shadow-sm`
                          : `border-border hover:border-brand/40 hover:shadow-md`
                      } ${!canEdit ? 'cursor-default' : 'cursor-pointer'} ${isCut ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
                              <svg className="w-3 h-3 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                              <CountryFlag country={country} countryCode={countryCode} />
                              {p.name}
                            </p>
                            {owgr && (
                              <span className="text-xs text-text-muted">Rank #{owgr}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isLimitedMode && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              isAtCap ? 'bg-danger/20 text-danger-text' : 'bg-surface-inset text-text-muted'
                            }`}>
                              {pickCount}/{selectionCap}
                            </span>
                          )}
                          {isCut && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-danger/20 text-danger-text">CUT</span>
                          )}
                          {scoreToPar != null && (
                            <span className="text-sm font-medium text-text-primary">{formatGolfScore(scoreToPar)}</span>
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

      {/* Bottom submit */}
      {canEdit && selectedIds.size > 0 && (
        <div className="mt-6">
          {/* Desktop: static button */}
          <div className="hidden sm:block">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.size !== rosterSize}
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:bg-brand/50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : `${submittedAt ? 'Update' : 'Submit'} Roster (${selectedIds.size}/${rosterSize})`}
            </button>
          </div>
          {/* Mobile: sticky button */}
          <div className="sticky bottom-4 sm:hidden">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.size !== rosterSize}
              className="w-full py-3 text-sm font-medium rounded-lg bg-brand text-text-primary shadow-lg transition-colors disabled:bg-brand/50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : `${submittedAt ? 'Update' : 'Submit'} Roster (${selectedIds.size}/${rosterSize})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
