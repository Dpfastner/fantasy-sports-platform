'use client'

/**
 * Projected Cut Tracker — shows the current projected cut line and bubble
 * players (golfers within ±2 strokes of the line) for a tournament with a
 * cut rule configured in tournament.config.cut_rule.
 *
 * Auto-hides after round 2 (the cut is final, not a projection).
 */

import { useMemo } from 'react'
import {
  extractGolfers,
  computeProjectedCut,
  getLatestRound,
  type CutRule,
} from '@/lib/events/golf-aggregations'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
}

interface ProjectedCutTrackerProps {
  participants: Participant[]
  cutRule: CutRule
}

function formatScore(n: number | null): string {
  if (n == null) return '—'
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
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

export function ProjectedCutTracker({ participants, cutRule }: ProjectedCutTrackerProps) {
  const golfers = useMemo(() => extractGolfers(participants), [participants])
  const projection = useMemo(() => computeProjectedCut(golfers, cutRule), [golfers, cutRule])
  const latestRound = useMemo(() => getLatestRound(golfers), [golfers])

  // Hide after round 2 — the cut is fact, not projection, from R3 onward
  if (latestRound > 2) return null

  // No rule or not enough data
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
                        alt=""
                        width={18}
                        height={14}
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
