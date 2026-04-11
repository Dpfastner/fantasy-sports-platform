'use client'

import { useMemo } from 'react'
import { formatGolfScore } from '@/lib/events/shared'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

interface Member {
  id: string
  displayName: string
  entryName?: string | null
  primaryColor?: string | null
}

interface Top10LeaderboardProps {
  participants: Participant[]
  allRosterPicks?: Record<string, string[]>
  members: Member[]
  onSwitchTab: () => void
}

/**
 * Compact top-10 tournament leaderboard for the Overview tab.
 * Shows only rostered golfers sorted by score_to_par, top 10.
 * "See full leaderboard" link switches to the Leaderboard tab.
 */
export function Top10Leaderboard({
  participants,
  allRosterPicks,
  members,
  onSwitchTab,
}: Top10LeaderboardProps) {
  // Build set of rostered participant IDs
  const rosteredIds = useMemo(() => {
    if (!allRosterPicks) return new Set<string>()
    const ids = new Set<string>()
    for (const picks of Object.values(allRosterPicks)) {
      for (const id of picks) ids.add(id)
    }
    return ids
  }, [allRosterPicks])

  // Build ownership map: participantId → entry colors
  const ownershipMap = useMemo(() => {
    if (!allRosterPicks) return new Map<string, string[]>()
    const map = new Map<string, string[]>()
    for (const member of members) {
      const picks = allRosterPicks[member.id]
      if (!picks) continue
      const color = member.primaryColor || '#666'
      for (const pid of picks) {
        const existing = map.get(pid) || []
        existing.push(color)
        map.set(pid, existing)
      }
    }
    return map
  }, [allRosterPicks, members])

  // Get top 10 rostered golfers by score
  const top10 = useMemo(() => {
    return participants
      .filter(p => {
        if (!rosteredIds.has(p.id)) return false
        const meta = (p.metadata || {}) as Record<string, unknown>
        return meta.score_to_par != null && meta.status !== 'cut'
      })
      .sort((a, b) => {
        const aScore = ((a.metadata as Record<string, unknown>)?.score_to_par as number) ?? 999
        const bScore = ((b.metadata as Record<string, unknown>)?.score_to_par as number) ?? 999
        return aScore - bScore
      })
      .slice(0, 10)
  }, [participants, rosteredIds])

  if (top10.length === 0) return null

  return (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 bg-surface-inset border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
          Top 10 — Rostered Golfers
        </h3>
        <button
          onClick={onSwitchTab}
          className="text-[10px] text-brand hover:underline"
        >
          Full leaderboard &rarr;
        </button>
      </div>
      <div className="divide-y divide-border-subtle">
        {top10.map((p, i) => {
          const meta = (p.metadata || {}) as Record<string, unknown>
          const scoreToPar = meta.score_to_par as number
          const thru = meta.thru as number | null | undefined
          const colors = ownershipMap.get(p.id) || []
          const countryCode = meta.country_code as string | undefined

          return (
            <div
              key={p.id}
              className="grid grid-cols-[1.5rem_1fr_3rem_2.5rem] gap-2 px-3 py-1.5 items-center text-sm"
            >
              <span className="text-right text-text-muted text-xs">{i + 1}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Ownership dots */}
                {colors.length > 0 && (
                  <div className="flex gap-0.5 shrink-0">
                    {colors.slice(0, 3).map((c, ci) => (
                      <div
                        key={ci}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                {countryCode && (
                  <img
                    src={`https://flagcdn.com/16x12/${countryCode}.png`}
                    alt=""
                    width={14}
                    height={10}
                    className="shrink-0 rounded-[1px]"
                    loading="lazy"
                  />
                )}
                <span className="truncate text-text-primary">{p.name}</span>
              </div>
              <span
                className={`text-right font-mono tabular-nums text-sm font-medium ${
                  scoreToPar < 0
                    ? 'text-success-text'
                    : scoreToPar > 0
                      ? 'text-danger-text'
                      : 'text-text-primary'
                }`}
              >
                {formatGolfScore(scoreToPar)}
              </span>
              <span className="text-right text-xs text-text-muted">
                {typeof thru === 'number' ? (thru >= 18 ? 'F' : `${thru}`) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
