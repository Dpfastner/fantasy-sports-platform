'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { LeagueSummary } from '@/contexts/LeagueContext'

interface LeagueDropdownProps {
  currentLeague: { id: string; name: string; sportName: string }
  leagues: LeagueSummary[]
}

const SPORT_ICONS: Record<string, string> = {
  college_football: '\uD83C\uDFC8',
  golf: '\u26F3',
}

export function LeagueDropdown({ currentLeague, leagues }: LeagueDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const sortedLeagues = [...leagues].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-subtle transition-colors text-sm font-medium text-text-primary max-w-[200px]"
      >
        <span className="text-base" title={currentLeague.sportName}>
          {SPORT_ICONS[leagues.find(l => l.id === currentLeague.id)?.sportSlug || ''] || '\uD83C\uDFC6'}
        </span>
        <span className="truncate">{currentLeague.name}</span>
        <svg className={`w-4 h-4 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-text-muted font-medium uppercase tracking-wide">
            Your Leagues
          </div>
          {sortedLeagues.map(league => {
            const isCurrent = league.id === currentLeague.id
            const icon = SPORT_ICONS[league.sportSlug] || '\uD83C\uDFC6'
            return (
              <button
                key={league.id}
                onClick={() => {
                  if (!isCurrent) router.push(`/leagues/${league.id}`)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-subtle transition-colors ${
                  isCurrent ? 'bg-surface text-brand-text font-medium' : 'text-text-primary'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span className="truncate text-sm">{league.name}</span>
                {isCurrent && (
                  <svg className="w-4 h-4 ml-auto shrink-0 text-brand" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )
          })}
          {sortedLeagues.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-muted">No leagues yet. Create one or join with an invite code.</div>
          )}
        </div>
      )}
    </div>
  )
}
