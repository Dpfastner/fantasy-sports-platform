'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatGolfScore } from '@/lib/events/shared'
import { golferRoundToPar, golferAdjustedTotal } from '@/lib/events/golf-aggregations'
import { DEFAULT_TIERS, TIER_COLORS, getTier, type RosterTier } from '@/lib/events/tiers'
import { EntryAvatar } from '@/components/EntryAvatar'
import { GolfHoleGrid } from '@/components/GolfHoleGrid'
import { Par3CurseBadge } from '@/components/events/masters/Par3CurseBadge'
import { PimentoCheeseBadge } from '@/components/events/masters/PimentoCheeseBadge'
import { CrowsNestBadge } from '@/components/events/masters/CrowsNestBadge'

interface Member {
  id: string
  userId: string | null
  entryName?: string | null
  userName?: string
  displayName: string
  isActive: boolean
  submittedAt: string | null
  score: number
  maxPossible: number
  rank: number | null
  primaryColor?: string | null
  secondaryColor?: string | null
  imageUrl?: string | null
}

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface MastersAwards {
  /** Map of entryId → array of round numbers they won pimento cheese for */
  pimentoWinners: Map<string, number[]>
  /** Current crow's nest holders — ties share the attic */
  crowsNestHolders: Array<{ entryId: string; rounds: number[] }>
}

interface RosterLeaderboardProps {
  members: Member[]
  participants: Participant[]
  poolStatus: string
  scoringRules: Record<string, unknown>
  allRosterPicks?: Record<string, string[]>
  tournamentSlug?: string
  mastersAwards?: MastersAwards
}


export function RosterLeaderboard({
  members,
  participants,
  poolStatus,
  scoringRules,
  tournamentSlug,
  mastersAwards,
  allRosterPicks,
}: RosterLeaderboardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const tiers = useMemo(() => {
    const t = scoringRules?.tiers as Record<string, RosterTier> | undefined
    return t && Object.keys(t).length > 0 ? t : DEFAULT_TIERS
  }, [scoringRules])

  const countBest = useMemo(() => (scoringRules?.count_best as number) || 5, [scoringRules])
  const rosterSize = useMemo(() => (scoringRules?.roster_size as number) || 7, [scoringRules])

  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>()
    for (const p of participants) map.set(p.id, p)
    return map
  }, [participants])

  const hasScores = participants.some(p => p.metadata?.score_to_par != null)
  const showScores = poolStatus === 'locked' || poolStatus === 'completed' || hasScores

  // Masters: detect Aaron Rai (2026 Par 3 Contest winner) for JINXED badge
  const isMasters = tournamentSlug?.startsWith('masters') ?? false
  const aaronRaiId = useMemo(() => {
    if (!isMasters) return null
    return participants.find(p => p.name.toLowerCase().includes('aaron rai'))?.id ?? null
  }, [isMasters, participants])

  // Check if an entry has Aaron Rai on their roster
  const entryHasRai = (entryId: string): boolean => {
    if (!aaronRaiId || !allRosterPicks?.[entryId]) return false
    return allRosterPicks[entryId].includes(aaronRaiId)
  }

  // Course par (Augusta = 72)
  const COURSE_PAR = 72
  // Entry-level per-round column. Best 5 counting golfers (sorted by
  // ADJUSTED total including cut penalty), sum their round to-par.
  const computeEntryRoundToPar = (entryId: string, round: 1 | 2 | 3 | 4): number | null => {
    const picks = allRosterPicks?.[entryId]
    if (!picks || picks.length === 0) return null

    const pickDetails = picks
      .map(id => {
        const p = participantMap.get(id)
        if (!p) return null
        const meta = (p.metadata || {}) as Record<string, unknown>
        return {
          roundToPar: golferRoundToPar(meta, round),
          adjustedTotal: golferAdjustedTotal(meta) ?? 999,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (pickDetails.length === 0) return null
    pickDetails.sort((a, b) => a.adjustedTotal - b.adjustedTotal)
    const counting = pickDetails.slice(0, countBest)

    let sum = 0, count = 0
    for (const c of counting) {
      if (c.roundToPar != null) { sum += c.roundToPar; count++ }
    }
    return count > 0 ? sum : null
  }

  // Live entry total — sum of counting 5 golfers' ADJUSTED score_to_par.
  // Adjusted = raw score + flat cut penalty (+8 per missed round).
  // This matches the server-side scoring engine so rankings agree.
  const computeEntryLiveTotal = (entryId: string): number | null => {
    const picks = allRosterPicks?.[entryId]
    if (!picks || picks.length === 0) return null
    const scores = picks
      .map(id => {
        const p = participantMap.get(id)
        if (!p) return null
        const meta = (p.metadata || {}) as Record<string, unknown>
        return golferAdjustedTotal(meta)
      })
      .filter((s): s is number => s !== null)
    if (scores.length === 0) return null
    scores.sort((a, b) => a - b)
    return scores.slice(0, countBest).reduce((a, b) => a + b, 0)
  }

  // Sort members by LIVE computed total (not stale event_entries.total_points).
  // Falls back to member.score when live total isn't available.
  const sorted = useMemo(() => {
    return [...members]
      .map(m => ({ ...m, liveScore: computeEntryLiveTotal(m.id) ?? m.score }))
      .sort((a, b) => {
        if (a.liveScore !== b.liveScore) return a.liveScore - b.liveScore
        if (a.submittedAt && b.submittedAt) {
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        }
        return a.submittedAt ? -1 : 1
      })
  }, [members, participants]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build roster breakdown for a member
  const getRosterBreakdown = (entryId: string) => {
    const pickIds = allRosterPicks?.[entryId]
    if (!pickIds) return null

    const golfers = pickIds
      .map(pid => participantMap.get(pid))
      .filter((p): p is Participant => !!p)
      .map(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        const owgr = (meta.owgr as number) ?? (p.seed ?? 999)
        return {
          id: p.id,
          name: p.name,
          tier: (meta.tier as string) || getTier(owgr, tiers),
          country: meta.country as string | undefined,
          countryCode: meta.country_code as string | undefined,
          scoreToPar: meta.score_to_par as number | null,
          r1: meta.r1 as number | null,
          r2: meta.r2 as number | null,
          r3: meta.r3 as number | null,
          r1ToPar: golferRoundToPar(meta, 1),
          r2ToPar: golferRoundToPar(meta, 2),
          r3ToPar: golferRoundToPar(meta, 3),
          r4ToPar: golferRoundToPar(meta, 4),
          r4: meta.r4 as number | null,
          status: (meta.status as string) || 'active',
          currentHole: meta.current_hole as number | null | undefined,
          currentRound: meta.current_round as number | null | undefined,
          thru: meta.thru as number | null | undefined,
          holes: (meta.holes as Array<{ hole: number; round: number; strokes: number; par: number; scoreType: string }> | undefined) || [],
          rank: owgr,
        }
      })

    // Sort by score when live, by tier+rank otherwise
    if (hasScores) {
      golfers.sort((a, b) => (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999))
    } else {
      const tierOrder: Record<string, number> = { A: 0, B: 1, C: 2 }
      golfers.sort((a, b) => {
        const td = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
        return td !== 0 ? td : a.rank - b.rank
      })
    }

    const counting = golfers.slice(0, countBest)
    const dropped = golfers.slice(countBest)
    return { counting, dropped }
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-6 text-center">
          <p className="text-text-muted">No entries yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border sm:overflow-x-auto">
          <div className="sm:min-w-[42rem] w-full">
          {/* Section title */}
          <div className="px-3 pt-3 pb-1">
            <h3 className="text-sm font-semibold text-text-primary">Rivalry Board</h3>
          </div>
          {/* Header — mobile: rank + player + total only; desktop: full row */}
          <div className="grid grid-cols-[2rem_1fr_3.5rem] sm:grid-cols-[2rem_minmax(9rem,14rem)_1fr_2.25rem_2.25rem_2.25rem_2.25rem_3rem_4rem] gap-2 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide">
            <span className="text-right">#</span>
            <span>Player</span>
            <span className="hidden sm:block" aria-hidden />
            <span className="hidden sm:block text-right">R1</span>
            <span className="hidden sm:block text-right">R2</span>
            <span className="hidden sm:block text-right">R3</span>
            <span className="hidden sm:block text-right">R4</span>
            <span className="text-right">{showScores ? 'Total' : 'Status'}</span>
            <span className="hidden sm:block text-right">Submitted</span>
          </div>

          {/* Rows */}
          {sorted.map((member, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3 && showScores && member.score !== 0
            const isExpanded = expandedId === member.id
            const canExpand = !!allRosterPicks?.[member.id]
            const breakdown = isExpanded ? getRosterBreakdown(member.id) : null
            const r1 = computeEntryRoundToPar(member.id, 1)
            const r2 = computeEntryRoundToPar(member.id, 2)
            const r3 = computeEntryRoundToPar(member.id, 3)
            const r4 = computeEntryRoundToPar(member.id, 4)
            const liveTotal = computeEntryLiveTotal(member.id)

            return (
              <div key={member.id}>
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => canExpand && setExpandedId(isExpanded ? null : member.id)}
                  className={`w-full grid grid-cols-[2rem_1fr_3.5rem] sm:grid-cols-[2rem_minmax(9rem,14rem)_1fr_2.25rem_2.25rem_2.25rem_2.25rem_3rem_4rem] gap-2 px-3 py-2.5 border-b border-border-subtle text-left transition-colors ${
                    canExpand ? 'hover:bg-surface-inset/50 cursor-pointer' : 'cursor-default'
                  } ${isExpanded ? 'bg-surface-inset/30' : ''}`}
                >
                  <span className={`text-right text-sm ${isTop3 ? 'font-bold text-brand' : 'text-text-muted'}`}>
                    {rank}
                  </span>
                  <div className="min-w-0 flex items-center gap-2">
                    <EntryAvatar imageUrl={member.imageUrl} primaryColor={member.primaryColor} showBorder />
                    <div className="min-w-0 flex-1">
                      {member.entryName ? (
                        <>
                          <span className="text-sm font-medium text-text-primary truncate block">
                            {member.entryName}
                          </span>
                          {member.userId ? (
                            <Link
                              href={`/profile/${member.userId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-text-muted truncate hover:underline block"
                            >
                              {member.userName}
                            </Link>
                          ) : (
                            <span className="text-xs text-text-muted truncate italic block">{member.userName}</span>
                          )}
                        </>
                      ) : member.userId ? (
                        <Link
                          href={`/profile/${member.userId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-text-primary truncate hover:underline block"
                        >
                          {member.displayName}
                        </Link>
                      ) : (
                        <span className="text-sm text-text-muted truncate italic block">{member.displayName}</span>
                      )}
                    </div>
                    {/* Masters inline badges */}
                    {isMasters && (
                      <div className="flex items-center gap-1 shrink-0">
                        {entryHasRai(member.id) && <Par3CurseBadge />}
                        {mastersAwards?.pimentoWinners.has(member.id) && (
                          mastersAwards.pimentoWinners.get(member.id)!.map(round => (
                            <PimentoCheeseBadge key={`pc-${round}`} round={round} entryName={member.entryName || member.displayName} />
                          ))
                        )}
                        {mastersAwards?.crowsNestHolders?.find(h => h.entryId === member.id) && (
                          <CrowsNestBadge
                            rounds={mastersAwards.crowsNestHolders.find(h => h.entryId === member.id)!.rounds}
                            entryName={member.entryName || member.displayName}
                          />
                        )}
                      </div>
                    )}
                    {canExpand && (
                      <svg
                        className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                  {/* Spacer + R1-R4 + Submitted hidden on mobile */}
                  <span className="hidden sm:block" aria-hidden />
                  <span className={`hidden sm:block text-right text-xs tabular-nums ${r1 != null && r1 < 0 ? 'text-success-text' : r1 != null && r1 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r1 == null ? '—' : formatGolfScore(r1)}
                  </span>
                  <span className={`hidden sm:block text-right text-xs tabular-nums ${r2 != null && r2 < 0 ? 'text-success-text' : r2 != null && r2 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r2 == null ? '—' : formatGolfScore(r2)}
                  </span>
                  <span className={`hidden sm:block text-right text-xs tabular-nums ${r3 != null && r3 < 0 ? 'text-success-text' : r3 != null && r3 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r3 == null ? '—' : formatGolfScore(r3)}
                  </span>
                  <span className={`hidden sm:block text-right text-xs tabular-nums ${r4 != null && r4 < 0 ? 'text-success-text' : r4 != null && r4 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r4 == null ? '—' : formatGolfScore(r4)}
                  </span>
                  <span className={`text-right text-sm ${showScores ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                    {showScores
                      ? formatGolfScore(liveTotal ?? member.score)
                      : member.submittedAt ? 'Ready' : '—'}
                  </span>
                  <span className="hidden sm:block text-right text-xs text-text-muted">
                    {member.submittedAt
                      ? new Date(member.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </span>
                </button>

                {/* Expanded roster breakdown — uses SAME grid as parent row for alignment */}
                {isExpanded && breakdown && (
                  <div className="bg-surface-inset/20 border-b border-border-subtle overflow-x-auto">
                    <div className="min-w-[40rem]" style={{ paddingRight: 16 }}>
                    {hasScores && (
                      <div className="text-[10px] text-text-muted px-3 pt-2">
                        Best {countBest} of {rosterSize} · {breakdown.counting.length} counting · {breakdown.dropped.length} dropped
                      </div>
                    )}
                    {breakdown.counting.map(p => (
                      <div key={p.id} className="grid grid-cols-[2rem_minmax(9rem,14rem)_1fr_2.25rem_2.25rem_2.25rem_2.25rem_3rem_4rem] gap-2 px-3 py-1.5 items-center border-b border-border-subtle">
                        {/* Tier */}
                        <div className="text-center">
                          <span className={`text-[10px] px-1 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                            {p.tier}
                          </span>
                        </div>
                        {/* Name */}
                        <div className="flex items-center gap-1.5 min-w-0 text-sm text-text-primary">
                          {p.countryCode && (
                            <img
                              src={`https://flagcdn.com/24x18/${p.countryCode}.png`}
                              alt={p.country || ''}
                              width={18} height={14}
                              className="inline-block shrink-0 rounded-[2px]"
                              loading="lazy"
                            />
                          )}
                          <span className="truncate">{p.name}</span>
                          {p.status === 'cut' && <span className="text-[10px] text-danger-text shrink-0">CUT</span>}
                        </div>
                        {/* Holes — no inner scroll, outer container handles it */}
                        <div>
                          {p.holes && p.holes.length > 0 ? (
                            <GolfHoleGrid
                              holes={p.holes}
                              currentHole={p.currentHole ?? null}
                              thru={p.thru ?? null}
                              currentRound={p.currentRound ?? null}
                              hideLabel
                            />
                          ) : (
                            <span className="text-xs text-text-muted italic">No hole data</span>
                          )}
                        </div>
                        {/* R1-R4 */}
                        <span className={`text-right text-xs tabular-nums ${p.r1ToPar != null && p.r1ToPar < 0 ? 'text-success-text' : p.r1ToPar != null && p.r1ToPar > 0 ? 'text-danger-text' : 'text-text-muted'}`}>{p.r1ToPar != null ? formatGolfScore(p.r1ToPar) : '—'}</span>
                        <span className={`text-right text-xs tabular-nums ${p.r2ToPar != null && p.r2ToPar < 0 ? 'text-success-text' : p.r2ToPar != null && p.r2ToPar > 0 ? 'text-danger-text' : 'text-text-muted'}`}>{p.r2ToPar != null ? formatGolfScore(p.r2ToPar) : '—'}</span>
                        <span className={`text-right text-xs tabular-nums ${p.status === 'cut' ? 'text-danger-text' : p.r3ToPar != null && p.r3ToPar < 0 ? 'text-success-text' : p.r3ToPar != null && p.r3ToPar > 0 ? 'text-danger-text' : 'text-text-muted'}`}>{p.status === 'cut' ? 'CUT' : p.r3ToPar != null ? formatGolfScore(p.r3ToPar) : '—'}</span>
                        <span className={`text-right text-xs tabular-nums ${p.status === 'cut' ? 'text-danger-text' : p.r4ToPar != null && p.r4ToPar < 0 ? 'text-success-text' : p.r4ToPar != null && p.r4ToPar > 0 ? 'text-danger-text' : 'text-text-muted'}`}>{p.status === 'cut' ? 'CUT' : p.r4ToPar != null ? formatGolfScore(p.r4ToPar) : '—'}</span>
                        {/* Total */}
                        <span className="text-right text-sm font-medium text-text-primary">{formatGolfScore(p.scoreToPar)}</span>
                        {/* Submitted placeholder */}
                        <span />
                      </div>
                    ))}
                    {breakdown.dropped.map(p => (
                      <div key={p.id} className="grid grid-cols-[2rem_minmax(9rem,14rem)_1fr_2.25rem_2.25rem_2.25rem_2.25rem_3rem_4rem] gap-2 px-3 py-1 items-center border-b border-border-subtle opacity-50">
                        <div className="text-center">
                          <span className={`text-[10px] px-1 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                            {p.tier}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 text-sm text-text-muted">
                          {p.countryCode && (
                            <img src={`https://flagcdn.com/24x18/${p.countryCode}.png`} alt={p.country || ''} width={18} height={14} className="inline-block shrink-0 rounded-[2px]" loading="lazy" />
                          )}
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] italic">dropped</span>
                        </div>
                        <span />
                        <span className="text-right text-xs text-text-muted tabular-nums">{p.r1ToPar != null ? formatGolfScore(p.r1ToPar) : '—'}</span>
                        <span className="text-right text-xs text-text-muted tabular-nums">{p.r2ToPar != null ? formatGolfScore(p.r2ToPar) : '—'}</span>
                        <span className="text-right text-xs text-text-muted tabular-nums">{p.status === 'cut' ? 'CUT' : p.r3ToPar != null ? formatGolfScore(p.r3ToPar) : '—'}</span>
                        <span className="text-right text-xs text-text-muted tabular-nums">{p.status === 'cut' ? 'CUT' : p.r4ToPar != null ? formatGolfScore(p.r4ToPar) : '—'}</span>
                        <span className="text-right text-xs text-text-muted">{formatGolfScore(p.scoreToPar)}</span>
                        <span />
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}

