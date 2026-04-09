'use client'

/**
 * Collapsible wrapper for the Player Ownership card with two view modes:
 * - Ownership (default): list of picked golfers with ownership %
 * - Matrix: heatmap grid of entries x golfers colored by score-to-par
 *
 * Collapsed by default. Click the header to expand. View mode toggle appears
 * only when expanded.
 */

import { useState } from 'react'
import { RosterOwnership } from './RosterOwnership'
import { RosterMatrix } from './RosterMatrix'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface EntryLite {
  id: string
  displayName: string
  entryName?: string | null
  userName?: string
  score: number
}

interface PlayerOwnershipCardProps {
  participants: Participant[]
  selectionCounts: Record<string, number>
  totalEntries: number
  entries: EntryLite[]
  allRosterPicks: Record<string, string[]>
}

type ViewMode = 'ownership' | 'matrix'

export function PlayerOwnershipCard({
  participants,
  selectionCounts,
  totalEntries,
  entries,
  allRosterPicks,
}: PlayerOwnershipCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('ownership')

  if (totalEntries === 0) return null

  return (
    <div className="bg-surface rounded-lg border border-border">
      {/* Header — click to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-inset/30 transition-colors rounded-lg"
        aria-expanded={isOpen}
      >
        <h3 className="text-sm font-semibold text-text-primary">Player Ownership</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
          </span>
          <svg
            className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body — view toggle + selected view */}
      {isOpen && (
        <div className="px-5 pb-5 pt-1">
          {/* View mode toggle */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setViewMode('ownership')}
              className={`flex-1 text-xs font-semibold uppercase tracking-wider py-1.5 rounded transition-colors ${
                viewMode === 'ownership' ? 'bg-brand text-text-primary' : 'bg-surface-inset text-text-muted hover:text-text-primary'
              }`}
            >
              Ownership
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex-1 text-xs font-semibold uppercase tracking-wider py-1.5 rounded transition-colors ${
                viewMode === 'matrix' ? 'bg-brand text-text-primary' : 'bg-surface-inset text-text-muted hover:text-text-primary'
              }`}
            >
              Matrix
            </button>
          </div>

          {viewMode === 'ownership' ? (
            <RosterOwnership
              participants={participants}
              selectionCounts={selectionCounts}
              totalEntries={totalEntries}
              variant="embedded"
            />
          ) : (
            <RosterMatrix
              entries={entries}
              participants={participants}
              allRosterPicks={allRosterPicks}
            />
          )}
        </div>
      )}
    </div>
  )
}
