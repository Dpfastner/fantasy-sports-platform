'use client'

import { useMemo } from 'react'
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
  onShowAll: () => void
}

interface GolfHole {
  hole: number
  round: number
  strokes: number
  par: number
  scoreType: string
}

const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4]

// Grid: PRIOR | NAME | holes 1-9 | gap | holes 10-18
// Wider columns to fill the section
const GRID = '2.4rem 9rem repeat(9, minmax(1.8rem, 1fr)) 0.5rem repeat(9, minmax(1.8rem, 1fr))'

const MAX_ROWS = 10

export function MastersLeaderboard({
  participants,
  allRosterPicks,
  members,
  onShowAll,
}: MastersLeaderboardProps) {
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
      .slice(0, MAX_ROWS)
  }, [participants])

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
    const last = parts[parts.length - 1].toUpperCase()
    const firstInit = parts[0][0].toUpperCase()
    return `${last} ${firstInit}.`
  }

  const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: GRID }

  // Cell with right border — black lines like the real board
  const cell = (opts?: { first?: boolean; thick?: boolean; noBorder?: boolean }): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: opts?.noBorder ? 'none' : opts?.thick ? '2px solid #222' : '1px solid #333',
    borderBottom: '1px solid #333',
    padding: '2px 0',
    minHeight: 28,
    background: '#fff',
  })

  const scoreFont: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    color: '#1a1a1a',
  }

  const totalGolfers = participants.filter(p => {
    const m = (p.metadata || {}) as Record<string, unknown>
    return m.score_to_par != null || m.status === 'active'
  }).length

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: '42rem' }}>
        {/* ── White arch across full width — tall dome like the real sign ── */}
        <div
          style={{
            background: '#fff',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
            border: '2px solid #333',
            borderBottom: 'none',
            padding: '20px 0 8px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '.22em',
              color: '#1a1a1a',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            LEADERS
          </span>
        </div>

        {/* ── Main board ── */}
        <div style={{ border: '2px solid #333', borderTop: 'none', background: '#fff' }}>

          {/* HOLE row: PRIOR(vertical) | HOLE | 1 2 3 ... 9 | gap | 10 11 ... 18 */}
          <div style={row}>
            {/* PRIOR vertical label spanning HOLE + PAR rows */}
            <div style={{
              ...cell(),
              borderBottom: 'none',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.1em',
              color: '#1a1a1a',
              gridRow: '1 / 3',
            }}>
              PRIOR
            </div>
            <div style={{ ...cell({ thick: true }), justifyContent: 'flex-start', paddingLeft: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                HOLE
              </span>
            </div>
            {[1,2,3,4,5,6,7,8].map(h => (
              <div key={h} style={cell()}>
                <span style={scoreFont}>{h}</span>
              </div>
            ))}
            <div key={9} style={cell({ thick: true })}>
              <span style={scoreFont}>9</span>
            </div>
            {/* Gap between front 9 and back 9 */}
            <div style={{ background: '#e8e4da', borderBottom: '1px solid #333' }} />
            {[10,11,12,13,14,15,16,17].map(h => (
              <div key={h} style={cell()}>
                <span style={scoreFont}>{h}</span>
              </div>
            ))}
            <div key={18} style={cell({ noBorder: true })}>
              <span style={scoreFont}>18</span>
            </div>
          </div>

          {/* PAR row */}
          <div style={row}>
            {/* PRIOR column (empty, label spans from above visually) */}
            <div style={cell()} />
            <div style={{ ...cell({ thick: true }), justifyContent: 'flex-start', paddingLeft: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                PAR
              </span>
            </div>
            {AUGUSTA_PARS.slice(0, 8).map((par, i) => (
              <div key={i} style={cell()}>
                <span style={scoreFont}>{par}</span>
              </div>
            ))}
            <div style={cell({ thick: true })}>
              <span style={scoreFont}>{AUGUSTA_PARS[8]}</span>
            </div>
            {/* Gap */}
            <div style={{ background: '#e8e4da', borderBottom: '1px solid #333' }} />
            {AUGUSTA_PARS.slice(9, 17).map((par, i) => (
              <div key={i} style={cell()}>
                <span style={scoreFont}>{par}</span>
              </div>
            ))}
            <div style={cell({ noBorder: true })}>
              <span style={scoreFont}>{AUGUSTA_PARS[17]}</span>
            </div>
          </div>

          {/* ── Player rows ── */}
          {sortedGolfers.map((p) => {
            const meta = (p.metadata || {}) as Record<string, unknown>
            const isCut = String(meta.status || '') === 'cut'
            const prior = getPriorScore(meta)
            const holes = getHoleScores(meta, currentRound)
            const colors = ownershipMap.get(p.id) || []
            const isRai = p.name.toLowerCase().includes('aaron rai')

            return (
              <div key={p.id} style={{ ...row, opacity: isCut ? 0.35 : 1 }}>
                {/* PRIOR score */}
                <div style={cell()}>
                  <span style={{ ...scoreFont, fontSize: 15, color: prior != null && prior < 0 ? '#CC0000' : '#1a1a1a' }}>
                    {fmtPar(prior)}
                  </span>
                </div>
                {/* NAME */}
                <div style={{
                  ...cell({ thick: true }),
                  justifyContent: 'flex-start',
                  paddingLeft: 6,
                  gap: 3,
                  overflow: 'hidden',
                }}>
                  {colors.length > 0 && colors.slice(0, 2).map((c, ci) => (
                    <div key={ci} style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  ))}
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1a1a1a',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.03em',
                    whiteSpace: 'nowrap' as const,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                  }}>
                    {fmtName(p.name)}
                  </span>
                  {isRai && <Par3CurseBadge className="shrink-0" />}
                </div>
                {/* Holes 1-9 */}
                {holes.slice(0, 8).map((score, hi) => {
                  const par = AUGUSTA_PARS[hi]
                  const under = score != null && score < par
                  return (
                    <div key={hi} style={cell()}>
                      <span style={{ ...scoreFont, color: under ? '#CC0000' : '#1a1a1a' }}>
                        {score ?? ''}
                      </span>
                    </div>
                  )
                })}
                {/* Hole 9 with thick right border */}
                {(() => {
                  const score = holes[8]
                  const under = score != null && score < AUGUSTA_PARS[8]
                  return (
                    <div style={cell({ thick: true })}>
                      <span style={{ ...scoreFont, color: under ? '#CC0000' : '#1a1a1a' }}>
                        {score ?? ''}
                      </span>
                    </div>
                  )
                })()}
                {/* Gap */}
                <div style={{ background: '#e8e4da', borderBottom: '1px solid #333' }} />
                {/* Holes 10-18 */}
                {holes.slice(9, 17).map((score, hi) => {
                  const par = AUGUSTA_PARS[hi + 9]
                  const under = score != null && score < par
                  return (
                    <div key={hi} style={cell()}>
                      <span style={{ ...scoreFont, color: under ? '#CC0000' : '#1a1a1a' }}>
                        {score ?? ''}
                      </span>
                    </div>
                  )
                })}
                {/* Hole 18 no right border */}
                {(() => {
                  const score = holes[17]
                  const under = score != null && score < AUGUSTA_PARS[17]
                  return (
                    <div style={cell({ noBorder: true })}>
                      <span style={{ ...scoreFont, color: under ? '#CC0000' : '#1a1a1a' }}>
                        {score ?? ''}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )
          })}

          {/* Show all → navigate to Leaderboard tab */}
          {totalGolfers > MAX_ROWS && (
            <button
              type="button"
              onClick={onShowAll}
              style={{
                width: '100%',
                padding: '10px 0',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                background: '#1a5c38',
                border: 'none',
                borderTop: '2px solid #333',
                cursor: 'pointer',
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: '.06em',
              }}
            >
              Show all {totalGolfers} golfers →
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
