'use client'

import { useMemo } from 'react'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
}

interface RoundInsightProps {
  participants: Participant[]
  myRosterPickIds?: string[]
  cutRule?: { type: string; n?: number; strokes?: number } | null
}

function formatScore(n: number | null): string {
  if (n == null) return '—'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : String(n)
}

/**
 * Round-based insight card on the overview tab:
 * R1: "Your Contenders" — roster strength by OWGR
 * R2: Projected Cut — bubble golfers
 * R3: The Cut — who survived
 * R4: "Your Top 10" — which rostered golfers are in tournament top 10
 */
export function RoundInsight({ participants, myRosterPickIds, cutRule }: RoundInsightProps) {
  // Detect current round from field
  const currentRound = useMemo(() => {
    let maxRound = 0
    for (const p of participants) {
      const cr = ((p.metadata || {}) as Record<string, unknown>).current_round as number | undefined
      if (cr && cr > maxRound) maxRound = cr
    }
    return maxRound || 1
  }, [participants])

  const myPicks = useMemo(() => new Set(myRosterPickIds || []), [myRosterPickIds])

  // R1: Your Contenders
  if (currentRound === 1) {
    return <Contenders participants={participants} myPicks={myPicks} />
  }

  // R2: Projected Cut (use CutStatus which handles this)
  if (currentRound === 2) {
    return null // CutStatus component handles R2
  }

  // R3: The Cut (use CutStatus which handles this)
  if (currentRound === 3) {
    return null // CutStatus component handles R3
  }

  // R4: Your Top 10
  if (currentRound >= 4) {
    return <YourTop10 participants={participants} myPicks={myPicks} />
  }

  return null
}

function Contenders({ participants, myPicks }: { participants: Participant[]; myPicks: Set<string> }) {
  const myGolfers = useMemo(() => {
    return participants
      .filter(p => myPicks.has(p.id))
      .map(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        return {
          id: p.id,
          name: p.name,
          owgr: (meta.owgr as number) ?? 999,
          countryCode: meta.country_code as string | undefined,
        }
      })
      .sort((a, b) => a.owgr - b.owgr)
  }, [participants, myPicks])

  const totalField = participants.length
  const inTop10 = myGolfers.filter(g => g.owgr <= 10).length
  const inTop25 = myGolfers.filter(g => g.owgr <= 25).length

  if (myGolfers.length === 0) return null

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Your Contenders</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            {totalField} golfers in the field
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-brand">{inTop10}</div>
          <div className="text-[10px] text-text-muted">in OWGR top 10</div>
        </div>
      </div>

      {inTop25 > 0 && (
        <p className="text-xs text-text-muted mb-3">
          You have {inTop25} golfer{inTop25 !== 1 ? 's' : ''} ranked in the world top 25.
        </p>
      )}

      <div className="space-y-1">
        {myGolfers.map(g => (
          <div key={g.id} className="flex items-center justify-between gap-2 text-sm py-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {g.countryCode && (
                <img
                  src={`https://flagcdn.com/24x18/${g.countryCode}.png`}
                  alt="" width={18} height={14}
                  className="inline-block shrink-0 rounded-[2px]"
                  loading="lazy"
                />
              )}
              <span className="text-text-primary truncate">{g.name}</span>
            </div>
            <span className={`text-xs font-medium tabular-nums shrink-0 ${
              g.owgr <= 10 ? 'text-brand' : g.owgr <= 25 ? 'text-success-text' : 'text-text-muted'
            }`}>
              #{g.owgr}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function YourTop10({ participants, myPicks }: { participants: Participant[]; myPicks: Set<string> }) {
  // Get tournament top 10 by live score
  const top10 = useMemo(() => {
    return participants
      .filter(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        return meta.status !== 'cut' && meta.status !== 'wd' && meta.status !== 'dq' &&
          meta.score_to_par != null
      })
      .sort((a, b) => {
        const aScore = ((a.metadata || {}) as Record<string, unknown>).score_to_par as number
        const bScore = ((b.metadata || {}) as Record<string, unknown>).score_to_par as number
        return aScore - bScore
      })
      .slice(0, 10)
  }, [participants])

  const myInTop10 = top10.filter(p => myPicks.has(p.id))
  const myCount = myInTop10.length

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Your Golfers in the Top 10</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Championship Sunday
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${myCount > 0 ? 'text-brand' : 'text-text-muted'}`}>{myCount}</div>
          <div className="text-[10px] text-text-muted">of your picks</div>
        </div>
      </div>

      <div className="space-y-1">
        {top10.map((p, i) => {
          const meta = (p.metadata || {}) as Record<string, unknown>
          const isMine = myPicks.has(p.id)
          const score = meta.score_to_par as number
          const countryCode = meta.country_code as string | undefined
          const thru = meta.thru as number | null | undefined

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-2 text-sm py-1 px-2 rounded ${
                isMine ? 'bg-brand/10 border border-brand/20' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-text-muted w-5 text-right shrink-0">{i + 1}</span>
                {countryCode && (
                  <img
                    src={`https://flagcdn.com/24x18/${countryCode}.png`}
                    alt="" width={18} height={14}
                    className="inline-block shrink-0 rounded-[2px]"
                    loading="lazy"
                  />
                )}
                <span className={`truncate ${isMine ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                  {p.name}
                </span>
                {isMine && <span className="text-[9px] text-brand font-bold shrink-0">YOURS</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className={`text-sm font-medium ${
                  score < 0 ? 'text-success-text' : score > 0 ? 'text-danger-text' : 'text-text-primary'
                }`}>
                  {formatScore(score)}
                </span>
                <span className="text-[10px] text-text-muted w-4">
                  {typeof thru === 'number' ? (thru >= 18 ? 'F' : thru) : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {myCount === 0 && (
        <p className="text-xs text-text-muted italic mt-2">
          None of your golfers are in the top 10 right now. There's still time.
        </p>
      )}
    </div>
  )
}
