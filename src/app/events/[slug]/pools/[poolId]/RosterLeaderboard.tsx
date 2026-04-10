'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatGolfScore } from '@/lib/events/shared'
import { DEFAULT_TIERS, TIER_COLORS, getTier, type RosterTier } from '@/lib/events/tiers'
import { EntryAvatar } from '@/components/EntryAvatar'
import { GolfHoleGrid } from '@/components/GolfHoleGrid'

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

interface RosterLeaderboardProps {
  members: Member[]
  participants: Participant[]
  poolStatus: string
  scoringRules: Record<string, unknown>
  allRosterPicks?: Record<string, string[]>
}


export function RosterLeaderboard({
  members,
  participants,
  poolStatus,
  scoringRules,
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

  // Course par (Augusta = 72; future multi-course tournaments can read from course_data)
  const COURSE_PAR = 72

  // Compute the per-round to-par for an entry, applying the same "best 5 of 7"
  // counting rule as the Total column. The 5 counting golfers are determined
  // by their CURRENT total score_to_par (matching the scoring engine), then
  // we sum the round-X to-par for those 5 golfers only. Dropped golfers don't
  // contribute, even if they actually played the round.
  const computeEntryRoundToPar = (entryId: string, round: 1 | 2 | 3 | 4): number | null => {
    const picks = allRosterPicks?.[entryId]
    if (!picks || picks.length === 0) return null
    const rKey = `r${round}` as 'r1' | 'r2' | 'r3' | 'r4'

    // Build pick details with per-round strokes + total to-par for ranking
    const pickDetails = picks
      .map(id => {
        const p = participantMap.get(id)
        if (!p) return null
        const meta = (p.metadata || {}) as Record<string, unknown>
        const rVal = meta[rKey] as number | null | undefined
        const totalToPar = meta.score_to_par as number | null | undefined
        return {
          rStrokes: typeof rVal === 'number' && rVal > 0 ? rVal : null,
          totalToPar: typeof totalToPar === 'number' ? totalToPar : 999,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (pickDetails.length === 0) return null

    // Sort by total to-par ascending — best 5 are the counting golfers
    pickDetails.sort((a, b) => a.totalToPar - b.totalToPar)
    const counting = pickDetails.slice(0, countBest)

    // Sum the round to-par of counting golfers who actually completed this round
    let sum = 0
    let played = 0
    for (const c of counting) {
      if (c.rStrokes != null) {
        sum += (c.rStrokes - COURSE_PAR)
        played++
      }
    }
    return played > 0 ? sum : null
  }

  // Sort members: by score ascending (golf), then by submit time
  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      if (a.submittedAt && b.submittedAt) {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      }
      return a.submittedAt ? -1 : 1
    })
  }, [members])

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
          r4: meta.r4 as number | null,
          status: (meta.status as string) || 'active',
          currentHole: meta.current_hole as number | null | undefined,
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
        <div className="bg-surface rounded-lg border border-border overflow-x-auto">
          <div className="min-w-[42rem]">
          {/* Header */}
          <div className="grid grid-cols-[2rem_minmax(12rem,18rem)_2.25rem_2.25rem_2.25rem_2.25rem_3rem_4rem] gap-2 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide">
            <span className="text-right">#</span>
            <span>Player</span>
            <span className="text-right">R1</span>
            <span className="text-right">R2</span>
            <span className="text-right">R3</span>
            <span className="text-right">R4</span>
            <span className="text-right">{showScores ? 'Total' : 'Status'}</span>
            <span className="text-right">Submitted</span>
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

            return (
              <div key={member.id}>
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => canExpand && setExpandedId(isExpanded ? null : member.id)}
                  className={`w-full grid grid-cols-[2rem_minmax(12rem,18rem)_2.25rem_2.25rem_2.25rem_2.25rem_3rem_4rem] gap-2 px-3 py-2.5 border-b border-border-subtle text-left transition-colors ${
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
                    {canExpand && (
                      <svg
                        className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-right text-xs tabular-nums ${r1 != null && r1 < 0 ? 'text-success-text' : r1 != null && r1 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r1 == null ? '—' : formatGolfScore(r1)}
                  </span>
                  <span className={`text-right text-xs tabular-nums ${r2 != null && r2 < 0 ? 'text-success-text' : r2 != null && r2 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r2 == null ? '—' : formatGolfScore(r2)}
                  </span>
                  <span className={`text-right text-xs tabular-nums ${r3 != null && r3 < 0 ? 'text-success-text' : r3 != null && r3 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r3 == null ? '—' : formatGolfScore(r3)}
                  </span>
                  <span className={`text-right text-xs tabular-nums ${r4 != null && r4 < 0 ? 'text-success-text' : r4 != null && r4 > 0 ? 'text-danger-text' : 'text-text-muted'}`}>
                    {r4 == null ? '—' : formatGolfScore(r4)}
                  </span>
                  <span className={`text-right text-sm ${showScores && member.score !== 0 ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                    {showScores
                      ? formatGolfScore(member.score)
                      : member.submittedAt ? 'Ready' : '—'}
                  </span>
                  <span className="text-right text-xs text-text-muted">
                    {member.submittedAt
                      ? new Date(member.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </span>
                </button>

                {/* Expanded roster breakdown */}
                {isExpanded && breakdown && (
                  <div className="px-4 py-3 bg-surface-inset/20 border-b border-border-subtle">
                    <p className="text-xs text-text-muted mb-2">
                      Best {countBest} of {rosterSize} count
                      {hasScores && (
                        <> &middot; {breakdown.counting.length} counting &middot; {breakdown.dropped.length} dropped</>
                      )}
                    </p>
                    <div className="overflow-x-auto">
                      <div className="min-w-[62rem]">
                        <div className="grid grid-cols-[12rem_minmax(28rem,1fr)_2.5rem_2.25rem_2.25rem_2.25rem_2.25rem_3.5rem] gap-x-4 px-2 py-1.5 text-xs text-text-muted uppercase tracking-wide border-b border-border">
                          <span>Golfer</span>
                          <span>Holes</span>
                          <span className="text-center">Tier</span>
                          <span className="text-center">R1</span>
                          <span className="text-center">R2</span>
                          <span className="text-center">R3</span>
                          <span className="text-center">R4</span>
                          <span className="text-right">Total</span>
                        </div>
                        {breakdown.counting.map(p => (
                          <div key={p.id} className="grid grid-cols-[12rem_minmax(28rem,1fr)_2.5rem_2.25rem_2.25rem_2.25rem_2.25rem_3.5rem] gap-x-4 px-2 py-1.5 items-center border-b border-border-subtle">
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
                            </div>
                            <div className="flex justify-center">
                              {p.holes && p.holes.length > 0 ? (
                                <GolfHoleGrid
                                  holes={p.holes}
                                  currentHole={p.currentHole ?? null}
                                  thru={p.thru ?? null}
                                  hideLabel
                                />
                              ) : (
                                <span className="text-xs text-text-muted italic">No hole data yet</span>
                              )}
                            </div>
                            <div className="text-center">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                                {p.tier}
                              </span>
                            </div>
                            <span className="text-center text-sm text-text-secondary">{p.r1 ?? '—'}</span>
                            <span className="text-center text-sm text-text-secondary">{p.r2 ?? '—'}</span>
                            <span className="text-center text-sm text-text-secondary">{p.r3 ?? '—'}</span>
                            <span className="text-center text-sm text-text-secondary">{p.r4 ?? '—'}</span>
                            <span className="text-right text-sm font-medium text-text-primary">{formatGolfScore(p.scoreToPar)}</span>
                          </div>
                        ))}
                        {breakdown.dropped.map(p => (
                          <div key={p.id} className="grid grid-cols-[12rem_minmax(28rem,1fr)_2.5rem_2.25rem_2.25rem_2.25rem_2.25rem_3.5rem] gap-x-4 px-2 py-1.5 items-center border-b border-border-subtle opacity-50">
                            <div className="flex items-center gap-1.5 min-w-0 text-sm text-text-muted">
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
                              <span className="text-[10px] italic">dropped</span>
                            </div>
                            <div className="flex justify-center">
                              {p.holes && p.holes.length > 0 ? (
                                <GolfHoleGrid
                                  holes={p.holes}
                                  currentHole={p.currentHole ?? null}
                                  thru={p.thru ?? null}
                                  hideLabel
                                />
                              ) : (
                                <span className="text-xs text-text-muted italic">No hole data yet</span>
                              )}
                            </div>
                            <div className="text-center">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                                {p.tier}
                              </span>
                            </div>
                            <span className="text-center text-sm text-text-muted">{p.r1 ?? '—'}</span>
                            <span className="text-center text-sm text-text-muted">{p.r2 ?? '—'}</span>
                            <span className="text-center text-sm text-text-muted">{p.r3 ?? '—'}</span>
                            <span className="text-center text-sm text-text-muted">{p.r4 ?? '—'}</span>
                            <span className="text-right text-sm text-text-muted">{formatGolfScore(p.scoreToPar)}</span>
                          </div>
                        ))}
                      </div>
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

