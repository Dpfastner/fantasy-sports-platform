'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TeamSummary } from '@/contexts/LeagueContext'

interface TeamDropdownProps {
  leagueId: string
  teams: TeamSummary[]
  userTeam: TeamSummary
}

export function TeamDropdown({ leagueId, teams, userTeam }: TeamDropdownProps) {
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

  // User's team first, then alphabetical
  const sortedTeams = [
    userTeam,
    ...teams.filter(t => t.id !== userTeam.id).sort((a, b) => a.name.localeCompare(b.name)),
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface-subtle transition-colors text-sm font-medium text-text-primary max-w-[180px]"
      >
        <div
          className="w-4 h-4 rounded-full shrink-0 border border-border"
          style={{ backgroundColor: userTeam.primaryColor }}
        />
        <span className="truncate">{userTeam.name}</span>
        <svg className={`w-4 h-4 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-text-muted font-medium uppercase tracking-wide">
            Teams in League
          </div>
          {sortedTeams.map((team, i) => {
            const isUser = team.id === userTeam.id
            return (
              <div key={team.id}>
                {i === 1 && sortedTeams.length > 1 && (
                  <div className="border-b border-border mx-2 my-1" />
                )}
                <button
                  onClick={() => {
                    if (isUser) {
                      router.push(`/leagues/${leagueId}/team`)
                    } else {
                      router.push(`/leagues/${leagueId}/team/${team.id}`)
                    }
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-subtle transition-colors ${
                    isUser ? 'font-medium text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0 border border-border"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <span className="truncate text-sm">{team.name}</span>
                  {isUser && (
                    <span className="ml-auto text-xs text-text-muted shrink-0">You</span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
