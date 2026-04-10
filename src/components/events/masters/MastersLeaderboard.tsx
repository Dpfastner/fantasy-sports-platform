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

// CSS Grid: PRIOR(2.2rem) | NAME(8rem) | 18 holes(1.4rem each) | THRU(2.8rem)
const GRID_COLS = '2.2rem 8rem repeat(18, 1.4rem) 2.8rem'

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

  function fmtPar(n: number | null): string {
    if (n == null) return ''
    if (n === 0) return 'E'
    return n > 0 ? `+${n}` : String(n)
  }

  function fmtName(name: string): string {
    const parts = name.split(' ')
    if (parts.length <= 1) return name.toUpperCase()
    return `${parts[parts.length - 1].toUpperCase()} ${parts[0][0].toUpperCase()}.`
  }

  const rowStyle = { display: 'grid', gridTemplateColumns: GRID_COLS } as const

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: '40rem' }}>
        {/* ── Arch header (green dome like the physical sign) ── */}
        <div className="flex justify-center">
          <div
            style={{
              width: '70%',
              height: 44,
              background: '#1a5c38',
              borderRadius: '50% 50% 0 0',
              border: '2px solid #333',
              borderBottom: 'none',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '.18em',
                fontFamily: 'Georgia, "Times New Roman", serif',
                textTransform: 'uppercase',
              }}
            >
              LEADERS
            </span>
          </div>
        </div>

        {/* ── Main board ── */}
        <div style={{ background: '#fff', border: '2px solid #333', overflow: 'hidden' }}>

          {/* HOLE label row */}
          <div style={{ ...rowStyle, borderBottom: '1px solid #333' }}>
            <div style={cellStyle(true)}><span style={hdrText}>PRIOR</span></div>
            <div style={cellStyle()} />
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} style={cellStyle()}>
                {(i === 4 || i === 13) && <span style={hdrText}>HOLE</span>}
              </div>
            ))}
            <div style={cellStyle()} />
          </div>

          {/* Hole numbers */}
          <div style={{ ...rowStyle, borderBottom: '1px solid #333' }}>
            <div style={cellStyle(true)} />
            <div style={cellStyle()} />
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} style={cellStyle()}>
                <span style={numText}>{i + 1}</span>
              </div>
            ))}
            <div style={cellStyle()}>
              <span style={hdrText}>THRU</span>
            </div>
          </div>

          {/* PAR row */}
          <div style={{ ...rowStyle, borderBottom: '2px solid #333' }}>
            <div style={cellStyle(true)} />
            <div style={{ ...cellStyle(), justifyContent: 'flex-start', paddingLeft: 6 }}>
              <span style={{ ...numText, fontWeight: 700 }}>PAR</span>
            </div>
            {AUGUSTA_PARS.map((par, i) => (
              <div key={i} style={cellStyle()}>
                <span style={numText}>{par}</span>
              </div>
            ))}
            <div style={cellStyle()} />
          </div>

          {/* ── Player rows ── */}
          {sortedGolfers.map((p, idx) => {
            const meta = (p.metadata || {}) as Record<string, unknown>
            const isCut = String(meta.status || '') === 'cut'
            const prior = getPriorScore(meta)
            const holes = getHoleScores(meta, currentRound)
            const thru = meta.thru as number | null | undefined
            const thruLabel = typeof thru === 'number' ? (thru >= 18 ? 'F' : String(thru)) : ''
            const colors = ownershipMap.get(p.id) || []
            const isHidden = !expanded && idx >= collapseLimit
            const isRai = p.name.toLowerCase().includes('aaron rai')

            return (
              <div key={p.id} className={isHidden ? 'hidden' : ''}>
                {cutLineIndex != null && idx === cutLineIndex && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', background: '#fff' }}>
                    <div style={{ flex: 1, borderTop: '2px dashed rgba(200,0,0,.5)' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                      Projected Cut
                    </span>
                    <div style={{ flex: 1, borderTop: '2px dashed rgba(200,0,0,.5)' }} />
                  </div>
                )}
                <div
                  style={{
                    ...rowStyle,
                    borderBottom: '1px solid #bbb',
                    opacity: isCut ? 0.35 : 1,
                    background: hoveredRow === p.id ? '#f5f5e8' : '#fff',
                  }}
                  onMouseEnter={() => setHoveredRow(p.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* PRIOR */}
                  <div style={cellStyle(true)}>
                    <span style={{ ...numText, color: prior != null && prior < 0 ? '#CC0000' : '#1a1a1a' }}>
                      {fmtPar(prior)}
                    </span>
                  </div>
                  {/* NAME */}
                  <div style={{ ...cellStyle(), justifyContent: 'flex-start', paddingLeft: 4, gap: 3, overflow: 'hidden' }}>
                    {colors.length > 0 && colors.slice(0, 2).map((c, ci) => (
                      <div key={ci} style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    ))}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#1a1a1a',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {fmtName(p.name)}
                    </span>
                    {isCut && <span style={{ fontSize: 7, color: '#b91c1c', fontWeight: 700, flexShrink: 0 }}>CUT</span>}
                    {isRai && <Par3CurseBadge className="shrink-0" />}
                  </div>
                  {/* Holes 1-18 */}
                  {holes.map((score, hi) => {
                    const par = AUGUSTA_PARS[hi]
                    const under = score != null && score < par
                    return (
                      <div key={hi} style={cellStyle()}>
                        <span style={{ ...numText, color: under ? '#CC0000' : '#1a1a1a' }}>
                          {score ?? ''}
                        </span>
                      </div>
                    )
                  })}
                  {/* THRU */}
                  <div style={cellStyle()}>
                    <span style={numText}>{thruLabel}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {sortedGolfers.length > collapseLimit && (
            <button
              type="button"
              onClick={onToggleExpand}
              style={{
                width: '100%',
                padding: '8px 0',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#1a5c38',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid #999',
                cursor: 'pointer',
              }}
            >
              {expanded ? 'Show top 15' : `Show all ${sortedGolfers.length} golfers`}
            </button>
          )}

          {sortedGolfers.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 14 }}>
              No scores yet. The leaderboard will update when the tournament begins.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared inline style helpers ──

function cellStyle(first?: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeft: first ? 'none' : '1px solid #333',
    padding: '2px 0',
    minHeight: 20,
  }
}

const hdrText: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 700,
  color: '#1a1a1a',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
}

const numText: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#1a1a1a',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
}
