'use client'

/**
 * Right-panel hole detail view.
 * Header shows hole number, name, par, yardage, and the rich description.
 * Body shows all live tournament data for this hole (field avg, scoring
 * distribution, top 5 on the hole, and currently playing golfers).
 *
 * Panel uses bg-tertiary (cream on Royal Gambit, warm beige on Heritage
 * Field) for visual contrast with the dark map and the rest of the dark UI.
 */

import { type AugustaHole } from '@/lib/events/augusta-holes'
import {
  computeHoleLeaderboard,
  computeHoleDifficulty,
  computeHoleScoringDistribution,
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
      <div className="bg-tertiary rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-card-text-muted">Select a hole on the map to see details.</p>
      </div>
    )
  }

  const difficulty = computeHoleDifficulty(golfers, hole.number, round)
  const leaderboard = computeHoleLeaderboard(golfers, hole.number, round).slice(0, 5)
  const playingNow = golfers
    .filter(g => g.currentHole === hole.number && g.status !== 'cut' && g.status !== 'wd' && g.status !== 'dq')
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
  const distribution = computeHoleScoringDistribution(golfers, hole.number, round)

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
    : 'text-text-primary'

  return (
    <div className="bg-tertiary rounded-lg border border-border overflow-hidden">
      {/* Header — hole number, name, par, yards, description */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-card-text-muted uppercase tracking-wider mb-1">
              Hole {hole.number}
            </div>
            <h3 className="brand-h3 text-lg text-text-inverse leading-tight">{hole.name}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-brand leading-none">Par {hole.par}</div>
            <div className="text-xs text-card-text-muted mt-1">{hole.yards} yds</div>
          </div>
        </div>
        {hole.description && (
          <p className="mt-3 text-sm italic text-card-text-muted leading-relaxed">
            {hole.description}
          </p>
        )}
      </div>

      {/* Body — all live stats */}
      <div className="p-5 space-y-4">
        <HoleStatsView
          distribution={distribution}
          round={round}
          holeNumber={hole.number}
          difficultyLabel={difficultyLabel}
          difficultyColor={difficultyColor}
          playersFinished={difficulty.playersFinished}
          leaderboard={leaderboard}
          playingNow={playingNow}
        />
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

// ============================================================
// Stats view — scoring distribution bar chart
// ============================================================

import type { HoleScoringDistribution } from '@/lib/events/golf-aggregations'

type HoleLeaderboardEntry = GolferLite & { holeStrokes: number; holePar: number; holeScoreType: string }

interface HoleStatsViewProps {
  distribution: HoleScoringDistribution
  round: number
  holeNumber: number
  difficultyLabel: string
  difficultyColor: string
  playersFinished: number
  leaderboard: HoleLeaderboardEntry[]
  playingNow: GolferLite[]
}

function HoleStatsView({
  distribution,
  round,
  holeNumber,
  difficultyLabel,
  difficultyColor,
  playersFinished,
  leaderboard,
  playingNow,
}: HoleStatsViewProps) {
  const { eagles, birdies, pars, bogeys, doublesPlus, total } = distribution

  const rows: Array<{ label: string; count: number; barClass: string; textClass: string }> = [
    { label: 'Eagle+', count: eagles, barClass: 'bg-brand', textClass: 'text-brand' },
    { label: 'Birdie', count: birdies, barClass: 'bg-success', textClass: 'text-success-text' },
    { label: 'Par', count: pars, barClass: 'bg-surface-hover', textClass: 'text-text-secondary' },
    { label: 'Bogey', count: bogeys, barClass: 'bg-warning/70', textClass: 'text-warning-text' },
    { label: 'Double+', count: doublesPlus, barClass: 'bg-danger/70', textClass: 'text-danger-text' },
  ]

  const birdieOrBetterPct = total > 0 ? Math.round(((eagles + birdies) / total) * 100) : 0
  const bogeyOrWorsePct = total > 0 ? Math.round(((bogeys + doublesPlus) / total) * 100) : 0

  const hasNoLiveData = total === 0 && leaderboard.length === 0 && playingNow.length === 0

  if (hasNoLiveData) {
    return (
      <p className="text-sm text-card-text-muted italic text-center py-8">
        No live data for Hole {holeNumber} yet.
      </p>
    )
  }

  return (
    <>
      {/* Aggregate strip — Field Avg / Birdie+ / Bogey+ */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider mb-0.5">Field Avg</div>
          <div className={`text-base font-bold ${difficultyColor}`}>{difficultyLabel}</div>
          <div className="text-[9px] text-text-muted mt-0.5">{playersFinished} finished</div>
        </div>
        <div className="bg-surface rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider mb-0.5">Birdie+</div>
          <div className="text-base font-bold text-success-text">{birdieOrBetterPct}%</div>
        </div>
        <div className="bg-surface rounded-lg p-2.5 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider mb-0.5">Bogey+</div>
          <div className="text-base font-bold text-danger-text">{bogeyOrWorsePct}%</div>
        </div>
      </div>

      {/* Distribution bars — with grid lines */}
      {total > 0 && (
        <div>
          <div className="text-[10px] text-card-text-muted uppercase tracking-wider mb-2">
            Scoring Distribution · R{round} · {total} finished
          </div>
          <div className="bg-surface border border-border rounded overflow-hidden divide-y divide-border-subtle">
            {rows.map(row => {
              const pct = total > 0 ? (row.count / total) * 100 : 0
              return (
                <div key={row.label} className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 px-2 py-1.5">
                  <span className={`text-xs font-medium ${row.textClass}`}>{row.label}</span>
                  <div className="relative h-2.5 bg-surface-inset rounded-full overflow-hidden">
                    {/* Quarter tick marks as grid lines */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none">
                      <div className="w-px bg-border-subtle opacity-0" />
                      <div className="w-px bg-border-subtle/40" />
                      <div className="w-px bg-border-subtle/40" />
                      <div className="w-px bg-border-subtle/40" />
                      <div className="w-px bg-border-subtle opacity-0" />
                    </div>
                    <div
                      className={`relative h-full ${row.barClass} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-text-muted text-right">
                    {row.count} · {Math.round(pct)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top 5 best scores on hole */}
      {leaderboard.length > 0 && (
        <div>
          <div className="text-[10px] text-card-text-muted uppercase tracking-wider mb-2">
            Best on Hole {holeNumber} · R{round}
          </div>
          <div className="bg-surface divide-y divide-border-subtle border border-border rounded overflow-hidden">
            {leaderboard.map((g, i) => (
              <div key={g.id} className="flex items-center justify-between text-sm gap-2 px-2 py-1.5">
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
          <div className="text-[10px] text-card-text-muted uppercase tracking-wider mb-2">On The Tee Now</div>
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
    </>
  )
}
