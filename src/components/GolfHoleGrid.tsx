'use client'

/**
 * Compact 18-hole score grid for a single golfer.
 * Used in both the pool Leaderboard (tournament golfer standings) and
 * Rivalry Board expand drawer (member roster breakdown).
 *
 * Each hole shows strokes colored by scoreType:
 * - Eagle/better: bg-brand amber
 * - Birdie: bg-success green
 * - Par: bg-surface-inset neutral
 * - Bogey: bg-warning/60 amber
 * - Double+: bg-danger/70 red
 * - Unplayed: bordered outline
 * - Current hole: brand-colored outline pulse
 */

export interface GolfHole {
  hole: number
  round: number
  strokes: number
  par: number
  scoreType: string
}

interface GolfHoleGridProps {
  holes: GolfHole[]
  currentHole?: number | null
  thru?: number | null
  /** Optional label override (e.g. golfer name). If omitted, just shows R#/Thru/On# meta. */
  label?: string
  /** If true, hides the label row entirely (useful when parent already shows name). */
  hideLabel?: boolean
}

function scoreTypeClass(scoreType: string, strokes: number, par: number): string {
  const diff = strokes - par
  const name = scoreType.toUpperCase()
  if (name.includes('EAGLE') || diff <= -2) return 'bg-brand text-text-primary font-semibold'
  if (name.includes('BIRDIE') || diff === -1) return 'bg-success text-text-primary font-medium'
  if (name.includes('PAR') && diff === 0) return 'bg-surface-inset text-text-secondary'
  if (name.includes('BOGEY') && !name.includes('DOUBLE') && diff === 1) return 'bg-warning/60 text-text-primary'
  if (diff >= 2) return 'bg-danger/70 text-text-primary font-medium'
  return 'bg-surface-inset text-text-muted'
}

export function GolfHoleGrid({ holes, currentHole, thru, label, hideLabel }: GolfHoleGridProps) {
  if (!holes || holes.length === 0) {
    return (
      <div className="text-xs text-text-muted italic py-2">
        No hole data yet {typeof currentHole === 'number' && `· On #${currentHole}`}
      </div>
    )
  }

  // Show latest round that has data
  const latestRound = Math.max(...holes.map(h => h.round))
  const roundHoles = holes.filter(h => h.round === latestRound)
  const holeByNum = new Map(roundHoles.map(h => [h.hole, h]))

  const renderCell = (holeNum: number) => {
    const h = holeByNum.get(holeNum)
    const isCurrent = currentHole === holeNum
    if (!h) {
      return (
        <div
          key={holeNum}
          className={`shrink-0 w-7 h-7 flex items-center justify-center rounded text-[10px] ${
            isCurrent ? 'border border-brand text-brand' : 'text-text-muted/40'
          }`}
          title={`Hole ${holeNum}`}
        >
          —
        </div>
      )
    }
    return (
      <div
        key={holeNum}
        className={`shrink-0 w-7 h-7 flex items-center justify-center rounded text-[11px] ${scoreTypeClass(h.scoreType, h.strokes, h.par)}`}
        title={`Hole ${holeNum} · Par ${h.par} · ${h.scoreType.toLowerCase()}`}
      >
        {h.strokes}
      </div>
    )
  }

  const renderHoleLabel = (holeNum: number) => (
    <div
      key={`label-${holeNum}`}
      className="shrink-0 w-7 text-center text-[9px] text-text-muted font-mono"
    >
      {holeNum}
    </div>
  )

  return (
    <div>
      {!hideLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-primary font-medium truncate">{label || ''}</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">
            Round {latestRound}
            {typeof thru === 'number' && ` · Thru ${thru}`}
            {typeof currentHole === 'number' && currentHole > 0 && ` · On #${currentHole}`}
          </span>
        </div>
      )}
      <div className="overflow-x-auto pb-1">
        {/* Hole number header row */}
        <div className="flex gap-0.5 mb-1">
          {Array.from({ length: 9 }, (_, i) => i + 1).map(renderHoleLabel)}
          <div className="shrink-0 w-3" aria-hidden />
          {Array.from({ length: 9 }, (_, i) => i + 10).map(renderHoleLabel)}
        </div>
        {/* Strokes row — front 9 | back 9 separator */}
        <div className="flex gap-0.5">
          {Array.from({ length: 9 }, (_, i) => i + 1).map(renderCell)}
          <div className="shrink-0 w-3 flex items-center justify-center text-text-muted/40 text-[10px]" aria-hidden>|</div>
          {Array.from({ length: 9 }, (_, i) => i + 10).map(renderCell)}
        </div>
      </div>
    </div>
  )
}
