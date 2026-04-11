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

/**
 * Pre-cut (R1-R2): Shows projected cut line + bubble golfers.
 * Post-cut (R3+): Shows actual cut results — who made it, who didn't.
 */
export function CutStatus({ participants, cutRule }: CutStatusProps) {
  const golfers = useMemo(() => extractGolfers(participants), [participants])
  const projection = useMemo(() => computeProjectedCut(golfers, cutRule), [golfers, cutRule])
  const latestRound = useMemo(() => getLatestRound(golfers), [golfers])
  const [showCutList, setShowCutList] = useState(false)

  const hasCut = participants.some(p => {
    const meta = (p.metadata || {}) as Record<string, unknown>
    return meta.status === 'cut'
  })

  // POST-CUT MODE (R3+ or cut detected)
  if (hasCut || latestRound > 2) {
    const made: { name: string; score: number; countryCode?: string }[] = []
    const missed: { name: string; score: number; countryCode?: string }[] = []

    for (const p of participants) {
      const meta = (p.metadata || {}) as Record<string, unknown>
      const score = meta.score_to_par as number | null
      if (score == null) continue
      const countryCode = meta.country_code as string | undefined
      if (meta.status === 'cut') {
        missed.push({ name: p.name, score, countryCode })
      } else if (meta.status !== 'wd' && meta.status !== 'dq') {
        made.push({ name: p.name, score, countryCode })
      }
    }

    made.sort((a, b) => a.score - b.score)
    missed.sort((a, b) => a.score - b.score)

    // Find cut line score (highest score that made it)
    const cutLine = made.length > 0 ? made[made.length - 1].score : null

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
            {/* Missed the cut */}
            <div>
              <div className="text-[10px] text-danger-text uppercase tracking-wider mb-1.5 font-semibold">
                Missed the Cut ({missed.length})
              </div>
              <div className="space-y-0.5">
                {missed.map((g, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm py-0.5 opacity-60">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {g.countryCode && (
                        <img
                          src={`https://flagcdn.com/24x18/${g.countryCode}.png`}
                          alt="" width={18} height={14}
                          className="inline-block shrink-0 rounded-[2px]"
                          loading="lazy"
                        />
                      )}
                      <span className="text-text-muted truncate">{g.name}</span>
                    </div>
                    <span className={`text-sm font-medium tabular-nums shrink-0 ${scoreColor(g.score)}`}>
                      {formatScore(g.score)}
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

  // PRE-CUT MODE (R1-R2): projected cut
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
          <div className="text-[10px] text-text-muted">
            {insideCount}/{fieldSize} inside
          </div>
        </div>
      </div>

      {bubble.length > 0 ? (
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
            Bubble · Within 2 of cut
          </div>
          <div className="space-y-1">
            {bubble.slice(0, 10).map(g => {
              const s = g.scoreToPar as number
              const overBy = s - cutLine
              const insideNow = s <= cutLine
              return (
                <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
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
                    {g.position != null && (
                      <span className="text-[10px] text-text-muted shrink-0">T{g.position}</span>
                    )}
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
      ) : (
        <p className="text-xs text-text-muted italic">No golfers currently on the bubble.</p>
      )}
    </div>
  )
}
