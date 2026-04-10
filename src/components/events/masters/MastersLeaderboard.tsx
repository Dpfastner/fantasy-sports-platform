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

const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4]

// Column widths for the fixed grid (px)
const COL = {
  prior: 'w-[2.2rem]',
  name: 'w-[8rem]',
  hole: 'w-[1.5rem]',
  thru: 'w-[2.5rem]',
}

/** Single cell in the grid — always has left border for vertical lane lines. */
function Cell({
  children,
  className = '',
  header,
  first,
}: {
  children?: React.ReactNode
  className?: string
  header?: boolean
  first?: boolean
}) {
  return (
    <div
      className={`${first ? '' : 'border-l border-[#333]'} flex items-center justify-center ${
        header ? 'font-bold' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

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

  const currentRound = useMemo(() => {
    let maxRound = 0
    for (const p of participants) {
      const meta = (p.metadata || {}) as Record<string, unknown>
      const cr = meta.current_round as number | undefined
      if (cr && cr > maxRound) maxRound = cr
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

  const cutLineIndex = useMemo(() => {
    if (!cutPosition) return null
    const activeGolfers = sortedGolfers.filter(p => {
      const meta = (p.metadata || {}) as Record<string, unknown>
      return meta.status !== 'cut' && meta.status !== 'wd' && meta.status !== 'dq'
    })
    if (activeGolfers.length <= cutPosition) return null
    const cutScore = ((activeGolfers[cutPosition - 1]?.metadata as Record<string, unknown>)?.score_to_par as number) ?? null
    if (cutScore == null) return null
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

  function getPriorScore(meta: Record<string, unknown>): number | null {
    let total = 0
    let hasAny = false
    for (let r = 1; r < currentRound; r++) {
      const key = `r${r}`
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

  function formatName(name: string): string {
    const parts = name.split(' ')
    if (parts.length <= 1) return name.toUpperCase()
    const last = parts[parts.length - 1].toUpperCase()
    const firstInitial = parts[0][0].toUpperCase()
    return `${last} ${firstInitial}.`
  }

  // 22 columns: PRIOR | NAME | 1-9 (9) | 10-18 (9) | THRU
  const gridCols = `${COL.prior} ${COL.name} repeat(18, ${COL.hole}) ${COL.thru}`

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        {/* Arch header — the iconic scoreboard shape */}
        <div className="relative">
          {/* Green arch dome */}
          <div
            className="mx-auto rounded-t-[50%] bg-[#1a5c38] border-2 border-[#333] border-b-0 flex items-end justify-center pb-1"
            style={{ width: '60%', height: 48 }}
          >
            <h2
              className="text-lg sm:text-xl font-bold tracking-[.2em] text-white uppercase"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              LEADERS
            </h2>
          </div>
        </div>

        {/* Main board */}
        <div className="bg-white border-2 border-[#333] overflow-hidden">
          {/* HOLE row */}
          <div className="grid border-b border-[#333]" style={{ gridTemplateColumns: gridCols }}>
            <Cell first className={`${COL.prior} text-[7px] text-[#1a1a1a] py-0.5`}>
              <span className="leading-tight text-center text-[7px] font-bold">PRIOR</span>
            </Cell>
            <Cell className={`${COL.name} py-0.5`} />
            {Array.from({ length: 9 }, (_, i) => (
              <Cell key={i} className={`${COL.hole} text-[9px] font-bold text-[#1a1a1a] py-0.5`}>
                {i === 4 ? 'HOLE' : ''}
              </Cell>
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <Cell key={i + 9} className={`${COL.hole} text-[9px] font-bold text-[#1a1a1a] py-0.5`}>
                {i === 4 ? 'HOLE' : ''}
              </Cell>
            ))}
            <Cell className={`${COL.thru} py-0.5`} />
          </div>

          {/* Hole numbers row */}
          <div className="grid border-b border-[#333]" style={{ gridTemplateColumns: gridCols }}>
            <Cell first className={`${COL.prior} py-0.5`} />
            <Cell className={`${COL.name} py-0.5`} />
            {Array.from({ length: 18 }, (_, i) => (
              <Cell key={i} className={`${COL.hole} text-[10px] font-bold text-[#1a1a1a] py-0.5`}>
                {i + 1}
              </Cell>
            ))}
            <Cell className={`${COL.thru} py-0.5`} />
          </div>

          {/* PAR row */}
          <div className="grid border-b-2 border-[#333]" style={{ gridTemplateColumns: gridCols }}>
            <Cell first className={`${COL.prior} py-0.5`} />
            <Cell className={`${COL.name} text-[10px] font-bold text-[#1a1a1a] py-0.5 !justify-start pl-2`}>
              PAR
            </Cell>
            {AUGUSTA_PARS.map((par, i) => (
              <Cell key={i} className={`${COL.hole} text-[10px] font-bold text-[#1a1a1a] font-mono py-0.5`}>
                {par}
              </Cell>
            ))}
            <Cell className={`${COL.thru} py-0.5`} />
          </div>

          {/* Player rows */}
          {sortedGolfers.map((p, i) => {
            const meta = (p.metadata || {}) as Record<string, unknown>
            const isCut = String(meta.status || '') === 'cut'
            const priorScore = getPriorScore(meta)
            const holeScores = getHoleScores(meta, currentRound)
            const thru = meta.thru as number | null | undefined
            const thruLabel = typeof thru === 'number' ? (thru >= 18 ? 'F' : String(thru)) : ''
            const colors = ownershipMap.get(p.id) || []
            const isHidden = !expanded && i >= collapseLimit
            const isRai = p.name.toLowerCase().includes('aaron rai')

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
                <div
                  className={`grid border-b border-[#999] ${isCut ? 'opacity-40' : ''} ${
                    hoveredRow === p.id ? 'bg-[#f5f5e8]' : 'bg-white'
                  }`}
                  style={{ gridTemplateColumns: gridCols }}
                  onMouseEnter={() => setHoveredRow(p.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* PRIOR */}
                  <Cell first className={`${COL.prior} py-1 font-mono text-[11px] font-bold`}>
                    <span className={priorScore != null && priorScore < 0 ? 'text-[#CC0000]' : 'text-[#1a1a1a]'}>
                      {formatToPar(priorScore)}
                    </span>
                  </Cell>
                  {/* NAME */}
                  <Cell className={`${COL.name} py-1 !justify-start pl-1 gap-1`}>
                    {colors.length > 0 && (
                      <div className="flex gap-0.5 shrink-0">
                        {colors.slice(0, 2).map((c, ci) => (
                          <div key={ci} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-[#1a1a1a] uppercase tracking-wide truncate leading-tight">
                      {formatName(p.name)}
                    </span>
                    {isCut && <span className="text-[7px] text-red-700 font-bold shrink-0">CUT</span>}
                    {isRai && <Par3CurseBadge className="shrink-0" />}
                  </Cell>
                  {/* Holes 1-18 */}
                  {holeScores.map((score, hi) => {
                    const par = AUGUSTA_PARS[hi]
                    const isUnder = score != null && score < par
                    return (
                      <Cell
                        key={hi}
                        className={`${COL.hole} py-1 font-mono text-[11px] font-bold ${
                          isUnder ? 'text-[#CC0000]' : 'text-[#1a1a1a]'
                        }`}
                      >
                        {score ?? ''}
                      </Cell>
                    )
                  })}
                  {/* THRU */}
                  <Cell className={`${COL.thru} py-1 font-mono text-[10px] font-bold text-[#1a1a1a]`}>
                    {thruLabel}
                  </Cell>
                </div>
              </div>
            )
          })}

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
