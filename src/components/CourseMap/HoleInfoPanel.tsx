'use client'

/**
 * Right-panel hole detail view.
 * Shows hole metadata + live data:
 * - Hole name, par, yardage, nickname
 * - Description
 * - Field average score vs par (difficulty)
 * - List of golfers currently playing the hole
 * - Top scores on the hole today (per-hole leaderboard)
 */

import { type AugustaHole } from '@/lib/events/augusta-holes'
import {
  computeHoleLeaderboard,
  computeHoleDifficulty,
  type GolferLite,
} from '@/lib/events/golf-aggregations'

interface HoleInfoPanelProps {
  hole: AugustaHole | null
  round: number
  golfers: GolferLite[]
}

export function HoleInfoPanel({ hole, round, golfers }: HoleInfoPanelProps) {
  if (!hole) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-text-muted">Select a hole on the map to see details.</p>
      </div>
    )
  }

  const difficulty = computeHoleDifficulty(golfers, hole.number, round)
  const leaderboard = computeHoleLeaderboard(golfers, hole.number, round).slice(0, 5)
  const playingNow = golfers
    .filter(g => g.currentHole === hole.number && g.status !== 'cut' && g.status !== 'wd' && g.status !== 'dq')
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

  const vsPar = difficulty.avgVsPar
  const difficultyLabel = vsPar == null
    ? '—'
    : vsPar > 0 ? `+${vsPar.toFixed(2)}`
    : vsPar < 0 ? vsPar.toFixed(2)
    : 'E'
  const difficultyColor = vsPar == null
    ? 'text-text-muted'
    : vsPar > 0.2 ? 'text-danger-text'
    : vsPar < -0.2 ? 'text-success-text'
    : 'text-text-secondary'

  return (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-surface-inset border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Hole {hole.number}
            </div>
            <h3 className="brand-h3 text-lg text-text-primary leading-tight">{hole.name}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-brand leading-none">Par {hole.par}</div>
            <div className="text-xs text-text-muted mt-1">{hole.yards} yds</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Description */}
        <p className="text-sm text-text-secondary italic leading-relaxed">{hole.description}</p>

        {/* Difficulty strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-inset rounded-lg p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Field Avg R{round}</div>
            <div className={`text-lg font-bold ${difficultyColor}`}>{difficultyLabel}</div>
            <div className="text-[10px] text-text-muted">{difficulty.playersFinished} finished</div>
          </div>
          <div className="bg-surface-inset rounded-lg p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Now Playing</div>
            <div className="text-lg font-bold text-text-primary">{playingNow.length}</div>
            <div className="text-[10px] text-text-muted">golfer{playingNow.length === 1 ? '' : 's'} on hole</div>
          </div>
        </div>

        {/* Top scores this round */}
        {leaderboard.length > 0 && (
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
              Best on Hole {hole.number} · R{round}
            </div>
            <div className="space-y-1">
              {leaderboard.map((g, i) => (
                <div key={g.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-xs text-text-muted w-4 text-right">{i + 1}</span>
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
                  </div>
                  <span className={`text-sm font-medium tabular-nums shrink-0 ${scoreColor(g.holeStrokes, g.holePar)}`}>
                    {g.holeStrokes}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currently playing list */}
        {playingNow.length > 0 && (
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">On The Tee Now</div>
            <div className="flex flex-wrap gap-1.5">
              {playingNow.map(g => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1 text-xs bg-surface-inset rounded px-2 py-1 text-text-secondary"
                >
                  {g.countryCode && (
                    <img
                      src={`https://flagcdn.com/24x18/${g.countryCode}.png`}
                      alt=""
                      width={14}
                      height={11}
                      className="inline-block shrink-0 rounded-[1px]"
                      loading="lazy"
                    />
                  )}
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {leaderboard.length === 0 && playingNow.length === 0 && (
          <p className="text-sm text-text-muted italic text-center py-4">
            No live data for this hole yet.
          </p>
        )}
      </div>
    </div>
  )
}

function scoreColor(strokes: number, par: number): string {
  const diff = strokes - par
  if (diff <= -2) return 'text-brand'        // eagle+
  if (diff === -1) return 'text-success-text' // birdie
  if (diff === 0) return 'text-text-secondary' // par
  if (diff === 1) return 'text-warning-text'  // bogey
  return 'text-danger-text'                    // double+
}
