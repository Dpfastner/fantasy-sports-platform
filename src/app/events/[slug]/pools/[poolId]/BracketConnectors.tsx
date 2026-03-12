'use client'

import { CARD_HEIGHT, CONNECTOR_WIDTH } from './bracketUtils'

interface ConnectorPair {
  fromY1: number // Y center of first feeder card
  fromY2: number // Y center of second feeder card
  toY: number    // Y center of target card
}

interface BracketConnectorsProps {
  pairs: ConnectorPair[]
  totalHeight: number
}

/**
 * SVG connector lines between bracket rounds.
 * Draws horizontal lines from each feeder, a vertical joining them,
 * and a horizontal to the next round.
 */
export function BracketConnectors({ pairs, totalHeight }: BracketConnectorsProps) {
  const halfCard = CARD_HEIGHT / 2

  return (
    <svg
      width={CONNECTOR_WIDTH}
      height={totalHeight}
      className="shrink-0"
      style={{ minWidth: CONNECTOR_WIDTH }}
    >
      {pairs.map((pair, i) => {
        const y1 = pair.fromY1 + halfCard
        const y2 = pair.fromY2 + halfCard
        const yMid = pair.toY + halfCard
        const midX = CONNECTOR_WIDTH / 2

        return (
          <g key={i} className="text-border" stroke="currentColor" strokeWidth={1.5} fill="none">
            {/* Horizontal from top feeder */}
            <line x1={0} y1={y1} x2={midX} y2={y1} />
            {/* Horizontal from bottom feeder */}
            <line x1={0} y1={y2} x2={midX} y2={y2} />
            {/* Vertical connecting the two */}
            <line x1={midX} y1={y1} x2={midX} y2={y2} />
            {/* Horizontal to next round */}
            <line x1={midX} y1={yMid} x2={CONNECTOR_WIDTH} y2={yMid} />
          </g>
        )
      })}
    </svg>
  )
}
