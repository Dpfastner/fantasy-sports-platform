'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatGolfScore } from '@/lib/events/shared'
import { DEFAULT_TIERS, TIER_COLORS, getTier, type RosterTier } from '@/lib/events/tiers'
import { EntryAvatar } from '@/components/EntryAvatar'

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
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem] gap-2 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide">
            <span className="text-right">#</span>
            <span>Player</span>
            <span className="text-right">{showScores ? 'Score' : 'Status'}</span>
            <span className="text-right">Submitted</span>
          </div>

          {/* Rows */}
          {sorted.map((member, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3 && showScores && member.score !== 0
            const isExpanded = expandedId === member.id
            const canExpand = !!allRosterPicks?.[member.id]
            const breakdown = isExpanded ? getRosterBreakdown(member.id) : null

            return (
              <div key={member.id}>
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => canExpand && setExpandedId(isExpanded ? null : member.id)}
                  className={`w-full grid grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem] gap-2 px-3 py-2.5 border-b border-border-subtle text-left transition-colors ${
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
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-text-muted uppercase tracking-wide border-b border-border">
                            <th className="text-left py-1.5 pr-2">Golfer</th>
                            <th className="text-center py-1.5 px-1 w-10">Tier</th>
                            <th className="text-center py-1.5 px-1 w-10">R1</th>
                            <th className="text-center py-1.5 px-1 w-10">R2</th>
                            <th className="text-center py-1.5 px-1 w-10">R3</th>
                            <th className="text-center py-1.5 px-1 w-10">R4</th>
                            <th className="text-right py-1.5 pl-1 w-14">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.counting.map(p => (
                            <tr key={p.id} className="border-b border-border-subtle">
                              <td className="py-1.5 pr-2 text-text-primary">
                                <span className="flex items-center gap-1.5">
                                  {p.countryCode && (
                                    <img
                                      src={`https://flagcdn.com/24x18/${p.countryCode}.png`}
                                      alt={p.country || ''}
                                      width={18} height={14}
                                      className="inline-block shrink-0 rounded-[2px]"
                                      loading="lazy"
                                    />
                                  )}
                                  {p.name}
                                </span>
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                                  {p.tier}
                                </span>
                              </td>
                              <td className="py-1.5 px-1 text-center text-text-secondary">{p.r1 ?? '—'}</td>
                              <td className="py-1.5 px-1 text-center text-text-secondary">{p.r2 ?? '—'}</td>
                              <td className="py-1.5 px-1 text-center text-text-secondary">{p.r3 ?? '—'}</td>
                              <td className="py-1.5 px-1 text-center text-text-secondary">{p.r4 ?? '—'}</td>
                              <td className="py-1.5 pl-1 text-right font-medium text-text-primary">{formatGolfScore(p.scoreToPar)}</td>
                            </tr>
                          ))}
                          {breakdown.dropped.map(p => (
                            <tr key={p.id} className="border-b border-border-subtle opacity-50">
                              <td className="py-1.5 pr-2 text-text-muted">
                                <span className="flex items-center gap-1.5">
                                  {p.countryCode && (
                                    <img
                                      src={`https://flagcdn.com/24x18/${p.countryCode}.png`}
                                      alt={p.country || ''}
                                      width={18} height={14}
                                      className="inline-block shrink-0 rounded-[2px]"
                                      loading="lazy"
                                    />
                                  )}
                                  {p.name}
                                  <span className="text-[10px] italic">dropped</span>
                                </span>
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLORS[p.tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[p.tier]?.text || 'text-text-muted'}`}>
                                  {p.tier}
                                </span>
                              </td>
                              <td className="py-1.5 px-1 text-center text-text-muted">{p.r1 ?? '—'}</td>
                              <td className="py-1.5 px-1 text-center text-text-muted">{p.r2 ?? '—'}</td>
                              <td className="py-1.5 px-1 text-center text-text-muted">{p.r3 ?? '—'}</td>
                              <td className="py-1.5 px-1 text-center text-text-muted">{p.r4 ?? '—'}</td>
                              <td className="py-1.5 pl-1 text-right text-text-muted">{formatGolfScore(p.scoreToPar)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Per-hole breakdown — only shown when hole data is available */}
                    {breakdown.counting.some(p => p.holes && p.holes.length > 0) && (
                      <div className="mt-4 pt-3 border-t border-border-subtle">
                        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Hole by Hole</p>
                        <div className="space-y-2">
                          {breakdown.counting.filter(p => p.holes && p.holes.length > 0).map(p => (
                            <HoleGrid
                              key={p.id}
                              golferName={p.name}
                              holes={p.holes}
                              currentHole={p.currentHole ?? null}
                              thru={p.thru ?? null}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// HoleGrid — per-hole breakdown row for one golfer
// ============================================================

interface HoleGridProps {
  golferName: string
  holes: Array<{ hole: number; round: number; strokes: number; par: number; scoreType: string }>
  currentHole: number | null
  thru: number | null
}

function scoreTypeClass(scoreType: string, strokes: number, par: number): string {
  const diff = strokes - par
  // Prefer explicit classification from ESPN when present
  const name = scoreType.toUpperCase()
  if (name.includes('EAGLE') || diff <= -2) return 'bg-brand text-text-primary font-semibold'
  if (name.includes('BIRDIE') || diff === -1) return 'bg-success text-text-primary font-medium'
  if (name.includes('PAR') && diff === 0) return 'bg-surface-inset text-text-secondary'
  if (name.includes('BOGEY') && !name.includes('DOUBLE') && diff === 1) return 'bg-warning/60 text-text-primary'
  if (diff >= 2) return 'bg-danger/70 text-text-primary font-medium'
  return 'bg-surface-inset text-text-muted'
}

function HoleGrid({ golferName, holes, currentHole, thru }: HoleGridProps) {
  // Show latest round that has data
  const latestRound = Math.max(...holes.map(h => h.round))
  const roundHoles = holes.filter(h => h.round === latestRound)
  const holeByNum = new Map(roundHoles.map(h => [h.hole, h]))

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-primary truncate">{golferName}</span>
        <span className="text-[10px] text-text-muted">
          R{latestRound}
          {typeof thru === 'number' && ` · Thru ${thru}`}
          {typeof currentHole === 'number' && ` · On #${currentHole}`}
        </span>
      </div>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {Array.from({ length: 18 }, (_, i) => i + 1).map(holeNum => {
          const h = holeByNum.get(holeNum)
          const isCurrent = currentHole === holeNum
          if (!h) {
            return (
              <div
                key={holeNum}
                className={`shrink-0 w-7 h-7 flex items-center justify-center rounded text-[10px] border ${
                  isCurrent ? 'border-brand text-brand' : 'border-border-subtle text-text-muted'
                }`}
                title={`Hole ${holeNum}`}
              >
                {holeNum}
              </div>
            )
          }
          return (
            <div
              key={holeNum}
              className={`shrink-0 w-7 h-7 flex items-center justify-center rounded text-[11px] ${scoreTypeClass(h.scoreType, h.strokes, h.par)}`}
              title={`Hole ${holeNum} · Par ${h.par} · ${h.scoreType.toLowerCase()}`}
            >
              {h.strokes}
            </div>
          )
        })}
      </div>
    </div>
  )
}
