'use client'

import { useState, useMemo } from 'react'
import { extractGolfers, computeProjectedCut, getLatestRound, type CutRule } from '@/lib/events/golf-aggregations'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
}

interface CutStatusProps {
  participants: Participant[]
  cutRule: CutRule
}

function formatScore(n: number | null): string {
  if (n == null) return '—'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : String(n)
}

function scoreColor(n: number | null): string {
  if (n == null) return 'text-text-muted'
  if (n < 0) return 'text-success-text'
  if (n > 0) return 'text-danger-text'
  return 'text-text-secondary'
}

function describeCutRule(rule: CutRule): string {
  if (!rule) return ''
  if (rule.type === 'top_n_and_ties') return `Top ${rule.n} + ties`
  if (rule.type === 'stroke_limit') return `${formatScore(rule.strokes)} or better`
  return ''
}

interface GolferCutInfo {
  name: string
  score: number
  countryCode?: string
  r2Total: number // R1+R2 combined to par
  hasR3: boolean
}

/**
 * Derive cut status from scores when ESPN doesn't write status='cut'.
 * A golfer missed the cut if:
 * - The field is in R3+ (latestRound > 2)
 * - They have R1+R2 scores
 * - They have no R3 data (no r3 score AND no R3 holes)
 * - Their R2 cumulative score is above the cut line
 */
function deriveCutResults(
  participants: Participant[],
  cutRule: CutRule,
): { made: GolferCutInfo[]; missed: GolferCutInfo[]; cutLine: number | null } | null {
  // Determine if we're past R2
  let maxRound = 0
  let golferWithR3 = 0
  for (const p of participants) {
    const meta = (p.metadata || {}) as Record<string, unknown>
    const cr = meta.current_round as number | undefined
    if (cr && cr > maxRound) maxRound = cr
    if (typeof meta.r3 === 'number' && (meta.r3 as number) >= 60) golferWithR3++
  }

  // Not past R2 yet
  if (maxRound < 3) return null

  // Build list of all golfers with R1+R2 data
  const allGolfers: GolferCutInfo[] = []
  for (const p of participants) {
    const meta = (p.metadata || {}) as Record<string, unknown>
    if (meta.status === 'wd' || meta.status === 'dq') continue
    const r1 = meta.r1 as number | undefined
    const r2 = meta.r2 as number | undefined
    if (typeof r1 !== 'number' || typeof r2 !== 'number') continue
    const r2Total = (r1 - 72) + (r2 - 72)
    const hasR3 = (typeof meta.r3 === 'number' && (meta.r3 as number) >= 60) || golferWithR3 === 0
    const score = meta.score_to_par as number | null
    allGolfers.push({
      name: p.name,
      score: score ?? r2Total,
      countryCode: meta.country_code as string | undefined,
      r2Total,
      hasR3,
    })
  }

  // Sort by R2 cumulative score
  allGolfers.sort((a, b) => a.r2Total - b.r2Total)

  // Determine cut line from cutRule
  let cutLine: number | null = null
  if (cutRule?.type === 'top_n_and_ties') {
    const n = cutRule.n
    if (allGolfers.length > n) {
      cutLine = allGolfers[n - 1].r2Total
    }
  }

  if (cutLine == null) return null

  // Golfers at or below cutLine made it; above missed
  const made: GolferCutInfo[] = []
  const missed: GolferCutInfo[] = []
  for (const g of allGolfers) {
    if (g.r2Total <= cutLine) {
      made.push(g)
    } else {
      missed.push(g)
    }
  }

  return { made, missed, cutLine }
}

export function CutStatus({ participants, cutRule }: CutStatusProps) {
  const golfers = useMemo(() => extractGolfers(participants), [participants])
  const projection = useMemo(() => computeProjectedCut(golfers, cutRule), [golfers, cutRule])
  const latestRound = useMemo(() => getLatestRound(golfers), [golfers])
  const cutResults = useMemo(() => deriveCutResults(participants, cutRule), [participants, cutRule])
  const [showCutList, setShowCutList] = useState(false)

  // POST-CUT MODE
  if (cutResults) {
    const { made, missed, cutLine } = cutResults

    return (
      <div className="bg-surface rounded-lg border border-border p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">The Cut</h3>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {describeCutRule(cutRule)} · Final
            </p>
          </div>
          <div className="text-right">
            {cutLine != null && (
              <div className={`text-2xl font-bold ${scoreColor(cutLine)}`}>{formatScore(cutLine)}</div>
            )}
            <div className="text-[10px] text-text-muted">
              {made.length} made / {missed.length} missed
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCutList(!showCutList)}
          className="flex items-center gap-1.5 text-xs text-brand hover:underline mb-2"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showCutList ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showCutList ? 'Hide cut details' : 'Show cut details'}
        </button>

        {showCutList && (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-danger-text uppercase tracking-wider mb-1.5 font-semibold">
                Missed the Cut ({missed.length})
              </div>
              <div className="space-y-0.5">
                {missed.map((g, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm py-0.5 opacity-60">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {g.countryCode && (
                        <img src={`https://flagcdn.com/24x18/${g.countryCode}.png`} alt="" width={18} height={14} className="inline-block shrink-0 rounded-[2px]" loading="lazy" />
                      )}
                      <span className="text-text-muted truncate">{g.name}</span>
                    </div>
                    <span className={`text-sm font-medium tabular-nums shrink-0 ${scoreColor(g.r2Total)}`}>
                      {formatScore(g.r2Total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // PRE-CUT MODE
  if (!projection || projection.cutLine == null) return null

  const { cutLine, insideCount, fieldSize, bubble } = projection

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Projected Cut</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            {describeCutRule(cutRule)} · Round {latestRound}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${scoreColor(cutLine)}`}>{formatScore(cutLine)}</div>
          <div className="text-[10px] text-text-muted">{insideCount}/{fieldSize} inside</div>
        </div>
      </div>
      {bubble.length > 0 && (
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Bubble · Within 2 of cut</div>
          <div className="space-y-1">
            {bubble.slice(0, 10).map(g => {
              const s = g.scoreToPar as number
              const overBy = s - cutLine
              const insideNow = s <= cutLine
              return (
                <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {g.countryCode && (
                      <img src={`https://flagcdn.com/24x18/${g.countryCode}.png`} alt="" width={18} height={14} className="inline-block shrink-0 rounded-[2px]" loading="lazy" />
                    )}
                    <span className="text-text-primary truncate">{g.name}</span>
                    {g.position != null && <span className="text-[10px] text-text-muted shrink-0">T{g.position}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className={`text-sm font-medium ${scoreColor(s)}`}>{formatScore(s)}</span>
                    <span className={`text-[10px] ${insideNow ? 'text-success-text' : 'text-danger-text'}`}>
                      {insideNow ? `-${Math.abs(overBy)}` : `+${overBy}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
