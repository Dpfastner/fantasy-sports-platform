'use client'

import { useState, useMemo } from 'react'
import { Par3CurseBadge } from './Par3CurseBadge'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

interface Member {
  id: string
  displayName: string
  entryName?: string | null
  primaryColor?: string | null
}

interface MastersLeaderboardProps {
  participants: Participant[]
  allRosterPicks?: Record<string, string[]>
  members: Member[]
  cutPosition?: number | null
  expanded: boolean
  onToggleExpand: () => void
  collapseLimit?: number
}

interface GolfHole {
  hole: number
  round: number
  strokes: number
  par: number
  scoreType: string
}

// Augusta National pars for holes 1-18
const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4]

/**
 * Recreates the iconic physical white leaderboard at Augusta National.
 *
 * White background, black grid lines, "LEADERS" header, PRIOR column,
 * hole-by-hole scores 1-18, PAR row, red numbers for under par.
 */
export function MastersLeaderboard({
  participants,
  allRosterPicks,
  members,
  cutPosition,
  expanded,
  onToggleExpand,
  collapseLimit = 15,
}: MastersLeaderboardProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Build ownership map: participantId → entry colors
  const ownershipMap = useMemo(() => {
    if (!allRosterPicks) return new Map<string, string[]>()
    const map = new Map<string, string[]>()
    for (const member of members) {
      const picks = allRosterPicks[member.id]
      if (!picks) continue
      const color = member.primaryColor || '#666'
      for (const pid of picks) {
        const existing = map.get(pid) || []
        existing.push(color)
        map.set(pid, existing)
      }
    }
    return map
  }, [allRosterPicks, members])

  // Detect current round from participants
  const currentRound = useMemo(() => {
    let maxRound = 0
    for (const p of participants) {
      const meta = (p.metadata || {}) as Record<string, unknown>
      const cr = meta.current_round as number | undefined
      if (cr && cr > maxRound) maxRound = cr
      // Also check completed rounds
      for (const rk of ['r1', 'r2', 'r3', 'r4']) {
        const rv = meta[rk]
        if (typeof rv === 'number' && rv >= 60) {
          const rn = parseInt(rk.slice(1))
          if (rn > maxRound) maxRound = rn
        }
      }
    }
    return maxRound || 1
  }, [participants])

  // Sort golfers by score
  const sortedGolfers = useMemo(() => {
    return [...participants]
      .filter(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        return meta.score_to_par != null || meta.status === 'active'
      })
      .sort((a, b) => {
        const aMeta = (a.metadata || {}) as Record<string, unknown>
        const bMeta = (b.metadata || {}) as Record<string, unknown>
        const aCut = aMeta.status === 'cut'
        const bCut = bMeta.status === 'cut'
        if (aCut !== bCut) return aCut ? 1 : -1
        return ((aMeta.score_to_par as number) ?? 999) - ((bMeta.score_to_par as number) ?? 999)
      })
  }, [participants])

  // Compute cut line position considering ties
  const cutLineIndex = useMemo(() => {
    if (!cutPosition) return null
    // Find the score at position cutPosition (0-indexed: cutPosition - 1)
    const activeGolfers = sortedGolfers.filter(p => {
      const meta = (p.metadata || {}) as Record<string, unknown>
      return meta.status !== 'cut' && meta.status !== 'wd' && meta.status !== 'dq'
    })
    if (activeGolfers.length <= cutPosition) return null
    const cutScore = ((activeGolfers[cutPosition - 1]?.metadata as Record<string, unknown>)?.score_to_par as number) ?? null
    if (cutScore == null) return null
    // Find the last golfer at or below the cut score (ties make it through)
    let lastIndex = 0
    for (let i = 0; i < sortedGolfers.length; i++) {
      const meta = (sortedGolfers[i].metadata || {}) as Record<string, unknown>
      const score = meta.score_to_par as number | null
      if (score != null && score <= cutScore && meta.status !== 'cut') {
        lastIndex = i + 1
      }
    }
    return lastIndex
  }, [cutPosition, sortedGolfers])

  // Get hole-by-hole scores for the current round
  function getHoleScores(meta: Record<string, unknown>, round: number): (number | null)[] {
    const holes = (meta.holes as GolfHole[] | undefined) || []
    const scores: (number | null)[] = new Array(18).fill(null)
    for (const h of holes) {
      if (h.round === round && h.hole >= 1 && h.hole <= 18) {
        scores[h.hole - 1] = h.strokes
      }
    }
    return scores
  }

  // Format score to par for the "PRIOR" column (cumulative before current round)
  function getPriorScore(meta: Record<string, unknown>): number | null {
    let total = 0
    let hasAny = false
    for (let r = 1; r < currentRound; r++) {
      const key = `r${r}` as string
      const score = meta[key] as number | undefined
      if (typeof score === 'number' && score >= 60 && score <= 100) {
        total += score - 72
        hasAny = true
      }
    }
    return hasAny ? total : null
  }

  function formatToPar(n: number | null): string {
    if (n == null) return ''
    if (n === 0) return 'E'
    if (n > 0) return `+${n}`
    return String(n)
  }

  const isAaronRai = (name: string) => name.toLowerCase().includes('aaron rai')

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[56rem]">
        {/* The physical board */}
        <div className="bg-white rounded-lg border-2 border-[#333] overflow-hidden">
          {/* LEADERS header */}
          <div className="bg-white border-b-2 border-[#333] py-2 px-4">
            <h2
              className="text-center text-2xl font-bold tracking-[.15em] text-[#1a1a1a] uppercase"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              LEADERS
            </h2>
          </div>

          {/* Column headers */}
          <div className="border-b-2 border-[#333]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-r border-[#999] px-1 py-1 text-[10px] font-bold text-[#1a1a1a] w-8 text-center">
                    <span className="text-[8px] block leading-tight">PRIOR</span>
                  </th>
                  <th className="border-r border-[#999] px-2 py-1 text-xs font-bold text-[#1a1a1a] w-36 text-left">
                  </th>
                  <th className="border-r border-[#999] px-1 py-1 text-[10px] font-bold text-[#1a1a1a] text-center" colSpan={9}>
                    <div className="flex">
                      {[1,2,3,4,5,6,7,8,9].map(h => (
                        <span key={h} className="flex-1 text-center font-bold">{h}</span>
                      ))}
                    </div>
                  </th>
                  <th className="border-r border-[#999] px-1 py-1 text-[10px] font-bold text-[#1a1a1a] text-center" colSpan={9}>
                    <div className="flex">
                      {[10,11,12,13,14,15,16,17,18].map(h => (
                        <span key={h} className="flex-1 text-center font-bold">{h}</span>
                      ))}
                    </div>
                  </th>
                  <th className="px-1 py-1 text-[10px] font-bold text-[#1a1a1a] w-10 text-center">
                    THRU
                  </th>
                </tr>
                {/* PAR row */}
                <tr className="border-t border-[#999]">
                  <td className="border-r border-[#999] px-1 py-0.5 text-center"></td>
                  <td className="border-r border-[#999] px-2 py-0.5 text-xs font-bold text-[#1a1a1a]">PAR</td>
                  <td className="border-r border-[#999] px-1 py-0.5" colSpan={9}>
                    <div className="flex font-mono text-[11px] text-[#1a1a1a]">
                      {AUGUSTA_PARS.slice(0, 9).map((par, i) => (
                        <span key={i} className="flex-1 text-center font-bold">{par}</span>
                      ))}
                    </div>
                  </td>
                  <td className="border-r border-[#999] px-1 py-0.5" colSpan={9}>
                    <div className="flex font-mono text-[11px] text-[#1a1a1a]">
                      {AUGUSTA_PARS.slice(9).map((par, i) => (
                        <span key={i} className="flex-1 text-center font-bold">{par}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-1 py-0.5"></td>
                </tr>
              </thead>
            </table>
          </div>

          {/* Player rows */}
          <div>
            {sortedGolfers.map((p, i) => {
              const meta = (p.metadata || {}) as Record<string, unknown>
              const isCut = String(meta.status || '') === 'cut'
              const priorScore = getPriorScore(meta)
              const holeScores = getHoleScores(meta, currentRound)
              const thru = meta.thru as number | null | undefined
              const thruLabel = typeof thru === 'number' ? (thru >= 18 ? 'F' : String(thru)) : ''
              const colors = ownershipMap.get(p.id) || []
              const isHidden = !expanded && i >= collapseLimit
              const isRai = isAaronRai(p.name)

              return (
                <div key={p.id} className={isHidden ? 'hidden' : ''}>
                  {/* CUT line */}
                  {cutLineIndex != null && i === cutLineIndex && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-white">
                      <div className="flex-1 border-t-2 border-dashed border-red-600/60" />
                      <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Projected Cut</span>
                      <div className="flex-1 border-t-2 border-dashed border-red-600/60" />
                    </div>
                  )}
                  <table
                    className={`w-full border-collapse ${isCut ? 'opacity-40' : ''}`}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <tbody>
                      <tr className={`border-b border-[#ccc] ${hoveredRow === p.id ? 'bg-[#f5f5e8]' : 'bg-white'}`}>
                        {/* PRIOR */}
                        <td className="border-r border-[#999] px-1 py-1 w-8 text-center font-mono text-[11px] font-bold">
                          <span className={priorScore != null && priorScore < 0 ? 'text-[#CC0000]' : 'text-[#1a1a1a]'}>
                            {formatToPar(priorScore)}
                          </span>
                        </td>
                        {/* Name */}
                        <td className="border-r border-[#999] px-2 py-1 w-36">
                          <div className="flex items-center gap-1">
                            {colors.length > 0 && (
                              <div className="flex gap-0.5 shrink-0">
                                {colors.slice(0, 2).map((c, ci) => (
                                  <div key={ci} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            )}
                            <span className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wide truncate">
                              {p.name.split(' ').length > 1
                                ? `${p.name.split(' ').slice(-1)[0]}${p.name.split(' ').length > 1 ? ' ' + p.name.split(' ')[0][0] + '.' : ''}`
                                : p.name}
                            </span>
                            {isCut && <span className="text-[8px] text-red-700 font-bold">CUT</span>}
                            {isRai && <Par3CurseBadge />}
                          </div>
                        </td>
                        {/* Holes 1-9 */}
                        <td className="border-r border-[#999] px-1 py-1" colSpan={9}>
                          <div className="flex font-mono text-[11px]">
                            {holeScores.slice(0, 9).map((score, hi) => {
                              const par = AUGUSTA_PARS[hi]
                              const isUnder = score != null && score < par
                              const isOver = score != null && score > par
                              return (
                                <span
                                  key={hi}
                                  className={`flex-1 text-center font-bold ${
                                    isUnder ? 'text-[#CC0000]' : isOver ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]'
                                  }`}
                                >
                                  {score ?? ''}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        {/* Holes 10-18 */}
                        <td className="border-r border-[#999] px-1 py-1" colSpan={9}>
                          <div className="flex font-mono text-[11px]">
                            {holeScores.slice(9).map((score, hi) => {
                              const par = AUGUSTA_PARS[hi + 9]
                              const isUnder = score != null && score < par
                              return (
                                <span
                                  key={hi}
                                  className={`flex-1 text-center font-bold ${
                                    isUnder ? 'text-[#CC0000]' : 'text-[#1a1a1a]'
                                  }`}
                                >
                                  {score ?? ''}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        {/* THRU */}
                        <td className="px-1 py-1 w-10 text-center font-mono text-[11px] font-bold text-[#1a1a1a]">
                          {thruLabel}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>

          {/* Expand/collapse */}
          {sortedGolfers.length > collapseLimit && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full py-2 text-center text-xs font-bold text-[#1a5c38] hover:bg-[#f5f5e8] border-t border-[#999] transition-colors"
            >
              {expanded ? 'Show top 15' : `Show all ${sortedGolfers.length} golfers`}
            </button>
          )}

          {sortedGolfers.length === 0 && (
            <div className="p-6 text-center text-[#666] text-sm">
              No scores yet. The leaderboard will update when the tournament begins.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
