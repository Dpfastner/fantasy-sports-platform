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
const MAX_ROWS = 10

// Fixed-width grid so holes are always equally sized
// PRIOR(2.4rem) | NAME(6.5rem) | 9 holes | gap(3px) | 9 holes
const GRID = '2.4rem 6.5rem repeat(9, 1fr) 3px repeat(9, 1fr)'

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
    return `${parts[parts.length - 1].toUpperCase()} ${parts[0][0].toUpperCase()}.`
  }

  const totalGolfers = participants.filter(p => {
    const m = (p.metadata || {}) as Record<string, unknown>
    return m.score_to_par != null || m.status === 'active'
  }).length

  const rg: React.CSSProperties = { display: 'grid', gridTemplateColumns: GRID }

  // Borders
  const bR = '1px solid #333'
  const bR2 = '2px solid #222'
  const bB = '1px solid #333'
  const bB2 = '2px solid #222'

  return (
    <div style={{ position: 'relative', padding: '0 6px' }}>
      {/* ── Poles: white, flush against board edges ── */}
      <div style={{
        position: 'absolute', left: 0, top: 16, bottom: 0, width: 7,
        background: '#e8e4da', border: '1px solid #bbb', borderRadius: 2, zIndex: 5,
      }}>
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          border: '1px solid #bbb', boxShadow: '0 1px 2px rgba(0,0,0,.15)',
        }} />
      </div>
      <div style={{
        position: 'absolute', right: 0, top: 16, bottom: 0, width: 7,
        background: '#e8e4da', border: '1px solid #bbb', borderRadius: 2, zIndex: 5,
      }}>
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          border: '1px solid #bbb', boxShadow: '0 1px 2px rgba(0,0,0,.15)',
        }} />
      </div>

      <div style={{ margin: '0 5px', position: 'relative', zIndex: 1 }}>
        {/* ── White arch ── */}
        <div style={{
          background: '#fff',
          borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          border: '2px solid #333',
          borderBottom: 'none',
          padding: '18px 0 8px',
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: 28, fontWeight: 700, letterSpacing: '.25em', color: '#1a1a1a',
            fontFamily: '"Georgia", "Times New Roman", serif',
          }}>
            LEADERS
          </span>
        </div>

        {/* ── Board ── */}
        <div style={{ border: '2px solid #333', borderTop: '2px solid #333', background: '#fff' }}>

          {/* HOLE row */}
          <div style={rg}>
            {/* PRIOR stacked — spans HOLE + PAR rows */}
            <div style={{
              gridRow: '1 / 3', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              borderRight: bR2, borderBottom: bB2, background: '#fff',
            }}>
              {'PRIOR'.split('').map((ch, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', lineHeight: 1, fontFamily: '"Georgia", serif' }}>{ch}</span>
              ))}
            </div>
            {/* HOLE label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, borderRight: bR2, borderBottom: bB, background: '#fff', minHeight: 28 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif', letterSpacing: '.12em' }}>HOLE</span>
            </div>
            {/* Holes 1-9 */}
            {[1,2,3,4,5,6,7,8].map(h => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR, borderBottom: bB, minHeight: 28 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>{h}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR2, borderBottom: bB, minHeight: 28 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>9</span>
            </div>
            {/* Gap */}
            <div style={{ background: '#ddd', borderBottom: bB }} />
            {/* Holes 10-18 */}
            {[10,11,12,13,14,15,16,17].map(h => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR, borderBottom: bB, minHeight: 28 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>{h}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: bB, minHeight: 28 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>18</span>
            </div>
          </div>

          {/* PAR row */}
          <div style={rg}>
            {/* PRIOR col already spanned above — need empty cell but gridRow span handles it */}
            <div style={{ borderRight: bR2, borderBottom: bB2, background: '#fff', minHeight: 28 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, borderRight: bR2, borderBottom: bB2, background: '#fff', minHeight: 28 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif', letterSpacing: '.12em' }}>PAR</span>
            </div>
            {AUGUSTA_PARS.slice(0, 8).map((par, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR, borderBottom: bB2, minHeight: 28 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>{par}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR2, borderBottom: bB2, minHeight: 28 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>{AUGUSTA_PARS[8]}</span>
            </div>
            <div style={{ background: '#ddd', borderBottom: bB2 }} />
            {AUGUSTA_PARS.slice(9, 17).map((par, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR, borderBottom: bB2, minHeight: 28 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>{par}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: bB2, minHeight: 28 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: '"Georgia", serif' }}>{AUGUSTA_PARS[17]}</span>
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
              <div key={p.id} style={{ ...rg, opacity: isCut ? 0.35 : 1 }}>
                {/* PRIOR */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR2, borderBottom: bB, minHeight: 28, background: '#fff' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: '"Georgia", serif', color: prior != null && prior < 0 ? '#CC0000' : '#1a1a1a' }}>
                    {fmtPar(prior)}
                  </span>
                </div>
                {/* NAME */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                  paddingLeft: 6, gap: 3, borderRight: bR2, borderBottom: bB,
                  minHeight: 28, background: '#fff', overflow: 'hidden',
                }}>
                  {colors.length > 0 && colors.slice(0, 2).map((c, ci) => (
                    <div key={ci} style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  ))}
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: '#1a1a1a',
                    textTransform: 'uppercase' as const, letterSpacing: '.02em',
                    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                    fontFamily: '"Georgia", serif',
                  }}>
                    {fmtName(p.name)}
                  </span>
                  {isRai && <Par3CurseBadge className="shrink-0" />}
                </div>
                {/* Holes 1-8 */}
                {holes.slice(0, 8).map((score, hi) => {
                  const under = score != null && score < AUGUSTA_PARS[hi]
                  return (
                    <div key={hi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR, borderBottom: bB, minHeight: 28 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: '"Georgia", serif', color: under ? '#CC0000' : '#1a1a1a' }}>
                        {score ?? ''}
                      </span>
                    </div>
                  )
                })}
                {/* Hole 9 */}
                {(() => {
                  const s = holes[8]; const u = s != null && s < AUGUSTA_PARS[8]
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR2, borderBottom: bB, minHeight: 28 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: '"Georgia", serif', color: u ? '#CC0000' : '#1a1a1a' }}>{s ?? ''}</span>
                    </div>
                  )
                })()}
                {/* Gap */}
                <div style={{ background: '#ddd', borderBottom: bB }} />
                {/* Holes 10-17 */}
                {holes.slice(9, 17).map((score, hi) => {
                  const under = score != null && score < AUGUSTA_PARS[hi + 9]
                  return (
                    <div key={hi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: bR, borderBottom: bB, minHeight: 28 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: '"Georgia", serif', color: under ? '#CC0000' : '#1a1a1a' }}>
                        {score ?? ''}
                      </span>
                    </div>
                  )
                })}
                {/* Hole 18 */}
                {(() => {
                  const s = holes[17]; const u = s != null && s < AUGUSTA_PARS[17]
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: bB, minHeight: 28 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: '"Georgia", serif', color: u ? '#CC0000' : '#1a1a1a' }}>{s ?? ''}</span>
                    </div>
                  )
                })()}
              </div>
            )
          })}

          {/* Show all → green bar */}
          {totalGolfers > MAX_ROWS && (
            <button
              type="button"
              onClick={onShowAll}
              style={{
                width: '100%', padding: '10px 0', textAlign: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', background: '#1a5c38',
                border: 'none', borderTop: bB2, cursor: 'pointer',
                fontFamily: '"Georgia", serif', letterSpacing: '.06em',
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
