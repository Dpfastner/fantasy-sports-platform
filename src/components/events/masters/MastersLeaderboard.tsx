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

const PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4]
const MAX_ROWS = 10

export function MastersLeaderboard({
  participants, allRosterPicks, members, onShowAll,
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

  const sorted = useMemo(() => {
    return [...participants]
      .filter(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        return meta.score_to_par != null || meta.status === 'active'
      })
      .sort((a, b) => {
        const am = (a.metadata || {}) as Record<string, unknown>
        const bm = (b.metadata || {}) as Record<string, unknown>
        if ((am.status === 'cut') !== (bm.status === 'cut')) return am.status === 'cut' ? 1 : -1
        return ((am.score_to_par as number) ?? 999) - ((bm.score_to_par as number) ?? 999)
      })
      .slice(0, MAX_ROWS)
  }, [participants])

  function holes(meta: Record<string, unknown>, round: number): (number | null)[] {
    const h = (meta.holes as GolfHole[] | undefined) || []
    const s: (number | null)[] = new Array(18).fill(null)
    for (const x of h) if (x.round === round && x.hole >= 1 && x.hole <= 18) s[x.hole - 1] = x.strokes
    return s
  }

  function prior(meta: Record<string, unknown>): number | null {
    let t = 0, has = false
    for (let r = 1; r < currentRound; r++) {
      const v = meta[`r${r}`] as number | undefined
      if (typeof v === 'number' && v >= 60 && v <= 100) { t += v - 72; has = true }
    }
    return has ? t : null
  }

  function fp(n: number | null): string {
    if (n == null) return ''
    return n === 0 ? 'E' : n > 0 ? `+${n}` : String(n)
  }

  function fn(name: string): string {
    const p = name.split(' ')
    if (p.length <= 1) return name.toUpperCase()
    return `${p[p.length - 1].toUpperCase()} ${p[0][0].toUpperCase()}.`
  }

  const total = participants.filter(p => {
    const m = (p.metadata || {}) as Record<string, unknown>
    return m.score_to_par != null || m.status === 'active'
  }).length

  // Shared styles
  const F = '"Georgia", "Times New Roman", serif'
  const bdr = '1px solid #444'
  const bdr2 = '2px solid #333'

  // Build a single table — no CSS Grid issues
  return (
    <div style={{ position: 'relative', padding: '0 5px' }}>
      {/* Poles — white, overlapping the board border so no line is visible */}
      <div style={{ position: 'absolute', left: -3, top: 10, bottom: 0, width: 8, background: '#fff', zIndex: 10 }}>
        <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
      <div style={{ position: 'absolute', right: -3, top: 10, bottom: 0, width: 8, background: '#fff', zIndex: 10 }}>
        <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Arch — tighter padding, responsive LEADERS text */}
        <div style={{
          background: '#fff', borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          border: '2px solid #444', borderBottom: 'none',
          padding: '16px 0 8px', textAlign: 'center',
        }}>
          <span className="text-2xl sm:text-4xl" style={{ fontWeight: 700, letterSpacing: '.3em', color: '#1a1a1a', fontFamily: F }}>
            LEADERS
          </span>
        </div>

        {/* Board */}
        <div style={{ border: '2px solid #444', borderTop: bdr2, background: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontFamily: F }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 160 }} />
              {Array.from({ length: 18 }, (_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              {/* HOLE row + PRIOR spanning */}
              <tr>
                <th rowSpan={2} style={{ width: 36, borderRight: bdr2, borderBottom: bdr2, verticalAlign: 'middle', textAlign: 'center', padding: 4 }}>
                  {'PRIOR'.split('').map((ch, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>{ch}</div>
                  ))}
                </th>
                <th style={{ width: 160, borderRight: bdr2, borderBottom: bdr, textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', letterSpacing: '.12em' }}>HOLE</span>
                </th>
                {PARS.map((_, i) => (
                  <th key={i} style={{
                    borderRight: i === 8 ? bdr2 : i === 17 ? 'none' : bdr,
                    borderBottom: bdr,
                    textAlign: 'center', verticalAlign: 'middle',
                    padding: '6px 0', minWidth: 28,
                    ...(i === 9 ? { borderLeft: bdr2 } : {}),
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{i + 1}</span>
                  </th>
                ))}
              </tr>
              {/* PAR row */}
              <tr>
                <th style={{ borderRight: bdr2, borderBottom: bdr2, textAlign: 'center', verticalAlign: 'middle', padding: '6px 4px' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', letterSpacing: '.12em' }}>PAR</span>
                </th>
                {PARS.map((par, i) => (
                  <th key={i} style={{
                    borderRight: i === 8 ? bdr2 : i === 17 ? 'none' : bdr,
                    borderBottom: bdr2,
                    textAlign: 'center', verticalAlign: 'middle',
                    padding: '6px 0',
                    ...(i === 9 ? { borderLeft: bdr2 } : {}),
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{par}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const meta = (p.metadata || {}) as Record<string, unknown>
                const isCut = String(meta.status || '') === 'cut'
                const pr = prior(meta)
                const hs = holes(meta, currentRound)
                const colors = ownershipMap.get(p.id) || []
                const isRai = p.name.toLowerCase().includes('aaron rai')

                return (
                  <tr key={p.id} style={{ opacity: isCut ? 0.35 : 1 }}>
                    {/* PRIOR */}
                    <td style={{ borderRight: bdr2, borderBottom: bdr, textAlign: 'center', verticalAlign: 'middle', padding: '5px 2px' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: F, color: pr != null && pr < 0 ? '#CC0000' : '#1a1a1a' }}>
                        {fp(pr)}
                      </span>
                    </td>
                    {/* NAME */}
                    <td style={{ borderRight: bdr2, borderBottom: bdr, padding: '5px 6px', verticalAlign: 'middle', overflow: 'hidden', maxWidth: 90 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {colors.length > 0 && colors.slice(0, 2).map((c, ci) => (
                          <div key={ci} style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                        ))}
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: F,
                          textTransform: 'uppercase' as const, letterSpacing: '.02em',
                          whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {fn(p.name)}
                        </span>
                        {isRai && <Par3CurseBadge className="shrink-0" />}
                      </div>
                    </td>
                    {/* Holes 1-18 */}
                    {hs.map((score, hi) => {
                      const under = score != null && score < PARS[hi]
                      return (
                        <td key={hi} style={{
                          borderRight: hi === 8 ? bdr2 : hi === 17 ? 'none' : bdr,
                          borderBottom: bdr,
                          textAlign: 'center', verticalAlign: 'middle',
                          padding: '5px 0',
                          ...(hi === 9 ? { borderLeft: bdr2 } : {}),
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: F, color: under ? '#CC0000' : '#1a1a1a' }}>
                            {score ?? ''}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Show all */}
          {total > MAX_ROWS && (
            <button
              type="button"
              onClick={onShowAll}
              style={{
                width: '100%', minWidth: 640, padding: '10px 0', textAlign: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', background: '#1a5c38',
                border: 'none', borderTop: bdr2, cursor: 'pointer',
                fontFamily: F, letterSpacing: '.06em',
              }}
            >
              Show all {total} golfers →
            </button>
          )}

          {sorted.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 14, fontFamily: F }}>
              No scores yet. The leaderboard will update when the tournament begins.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
