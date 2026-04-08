'use client'

import { useState } from 'react'

interface Hole {
  number: number
  name: string
  par: number
  yards: number
  historicalAvg: number
  difficulty: number // 1-18 (1 = hardest, 18 = easiest)
}

// Augusta National hole data — verified from Masters.com official yardage
const AUGUSTA_HOLES: Hole[] = [
  { number: 1, name: 'Tea Olive', par: 4, yards: 445, historicalAvg: 4.24, difficulty: 6 },
  { number: 2, name: 'Pink Dogwood', par: 5, yards: 585, historicalAvg: 4.77, difficulty: 16 },
  { number: 3, name: 'Flowering Peach', par: 4, yards: 350, historicalAvg: 4.10, difficulty: 12 },
  { number: 4, name: 'Flowering Crab Apple', par: 3, yards: 240, historicalAvg: 3.26, difficulty: 3 },
  { number: 5, name: 'Magnolia', par: 4, yards: 495, historicalAvg: 4.28, difficulty: 2 },
  { number: 6, name: 'Juniper', par: 3, yards: 180, historicalAvg: 3.15, difficulty: 11 },
  { number: 7, name: 'Pampas', par: 4, yards: 450, historicalAvg: 4.18, difficulty: 7 },
  { number: 8, name: 'Yellow Jasmine', par: 5, yards: 570, historicalAvg: 4.82, difficulty: 15 },
  { number: 9, name: 'Carolina Cherry', par: 4, yards: 460, historicalAvg: 4.14, difficulty: 10 },
  { number: 10, name: 'Camellia', par: 4, yards: 495, historicalAvg: 4.32, difficulty: 1 },
  { number: 11, name: 'White Dogwood', par: 4, yards: 520, historicalAvg: 4.29, difficulty: 4 },
  { number: 12, name: 'Golden Bell', par: 3, yards: 155, historicalAvg: 3.30, difficulty: 5 },
  { number: 13, name: 'Azalea', par: 5, yards: 545, historicalAvg: 4.79, difficulty: 14 },
  { number: 14, name: 'Chinese Fir', par: 4, yards: 440, historicalAvg: 4.16, difficulty: 9 },
  { number: 15, name: 'Firethorn', par: 5, yards: 550, historicalAvg: 4.83, difficulty: 17 },
  { number: 16, name: 'Redbud', par: 3, yards: 170, historicalAvg: 3.17, difficulty: 13 },
  { number: 17, name: 'Nandina', par: 4, yards: 440, historicalAvg: 4.19, difficulty: 8 },
  { number: 18, name: 'Holly', par: 4, yards: 465, historicalAvg: 4.23, difficulty: 18 },
]

const AMEN_CORNER = [11, 12, 13]

export function AugustaCourseGuide() {
  const [selectedHole, setSelectedHole] = useState<number | null>(null)

  const totalPar = AUGUSTA_HOLES.reduce((sum, h) => sum + h.par, 0)
  const totalYards = AUGUSTA_HOLES.reduce((sum, h) => sum + h.yards, 0)
  const front9 = AUGUSTA_HOLES.slice(0, 9)
  const back9 = AUGUSTA_HOLES.slice(9)
  const front9Par = front9.reduce((sum, h) => sum + h.par, 0)
  const back9Par = back9.reduce((sum, h) => sum + h.par, 0)
  const front9Yards = front9.reduce((sum, h) => sum + h.yards, 0)
  const back9Yards = back9.reduce((sum, h) => sum + h.yards, 0)

  const hardestHole = [...AUGUSTA_HOLES].sort((a, b) => a.difficulty - b.difficulty)[0]
  const easiestHole = [...AUGUSTA_HOLES].sort((a, b) => b.difficulty - a.difficulty)[0]

  const selected = selectedHole ? AUGUSTA_HOLES.find(h => h.number === selectedHole) : null

  return (
    <div className="bg-surface rounded-lg p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Augusta National</h3>
          <p className="text-xs text-text-muted">Par {totalPar} · {totalYards.toLocaleString()} yards</p>
        </div>
        <div className="text-xs text-text-muted text-right">
          <div>Hardest: #{hardestHole.number} {hardestHole.name}</div>
          <div>Easiest: #{easiestHole.number} {easiestHole.name}</div>
        </div>
      </div>

      {/* 18-hole grid */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Front 9</span>
            <span className="text-[10px] text-text-muted">Par {front9Par} · {front9Yards} yds</span>
          </div>
          <div className="grid grid-cols-9 gap-1">
            {front9.map(h => (
              <HoleButton key={h.number} hole={h} isSelected={selectedHole === h.number} isAmenCorner={AMEN_CORNER.includes(h.number)} onClick={() => setSelectedHole(selectedHole === h.number ? null : h.number)} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Back 9</span>
            <span className="text-[10px] text-text-muted">Par {back9Par} · {back9Yards} yds</span>
          </div>
          <div className="grid grid-cols-9 gap-1">
            {back9.map(h => (
              <HoleButton key={h.number} hole={h} isSelected={selectedHole === h.number} isAmenCorner={AMEN_CORNER.includes(h.number)} onClick={() => setSelectedHole(selectedHole === h.number ? null : h.number)} />
            ))}
          </div>
        </div>

        {/* Amen Corner callout */}
        <div className="text-[10px] text-text-muted flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-warning" />
          <span>Amen Corner (holes 11-13)</span>
        </div>

        {/* Selected hole detail */}
        {selected && (
          <div className="mt-3 bg-surface-inset rounded-lg p-3 border border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-brand">#{selected.number}</span>
                  <span className="text-sm font-semibold text-text-primary">{selected.name}</span>
                  {AMEN_CORNER.includes(selected.number) && (
                    <span className="text-[9px] bg-warning/20 text-warning-text px-1.5 py-0.5 rounded uppercase font-bold">Amen Corner</span>
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  Par {selected.par} · {selected.yards} yards
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-muted">Historical avg</div>
                <div className={`text-sm font-bold tabular-nums ${selected.historicalAvg > selected.par ? 'text-danger-text' : 'text-success-text'}`}>
                  {selected.historicalAvg > selected.par ? '+' : ''}{(selected.historicalAvg - selected.par).toFixed(2)}
                </div>
                <div className="text-[10px] text-text-muted">Difficulty #{selected.difficulty}/18</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HoleButton({ hole, isSelected, isAmenCorner, onClick }: { hole: Hole; isSelected: boolean; isAmenCorner: boolean; onClick: () => void }) {
  const relativeToPar = hole.historicalAvg - hole.par
  const bgIntensity = relativeToPar > 0.25 ? 'bg-danger/15' : relativeToPar > 0.15 ? 'bg-danger/8' : relativeToPar < -0.15 ? 'bg-success/15' : 'bg-surface-inset'

  return (
    <button
      onClick={onClick}
      className={`relative aspect-square rounded flex flex-col items-center justify-center transition-all border ${
        isSelected ? 'border-brand ring-1 ring-brand' : 'border-border hover:border-brand/40'
      } ${bgIntensity}`}
      title={`#${hole.number} ${hole.name} — Par ${hole.par}, ${hole.yards}y`}
    >
      <span className="text-[10px] font-bold text-text-primary leading-none">{hole.number}</span>
      <span className="text-[9px] text-text-muted leading-none mt-0.5">Par {hole.par}</span>
      {isAmenCorner && (
        <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-warning" />
      )}
    </button>
  )
}
