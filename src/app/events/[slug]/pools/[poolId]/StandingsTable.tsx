'use client'

import { useState, useEffect } from 'react'

interface Standing {
  rank: number
  teamCode: string
  teamName: string
  gamesPlayed: number
  won: number
  drawn: number
  lost: number
  pointsFor: number
  pointsAgainst: number
  pointsDifference: number
  bonusPoints: number
  points: number
  logoUrl: string | null
}

interface StandingsData {
  standings: Standing[]
  hasBonus: boolean
  source: string
}

export function StandingsTable({ tournamentId }: { tournamentId: string }) {
  const [data, setData] = useState<StandingsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/events/standings?tournamentId=${tournamentId}`)
      .then(res => res.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tournamentId])

  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="animate-pulse p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-surface-inset rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data?.standings?.length) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6 text-center">
        <p className="text-text-muted text-sm">No standings data available yet.</p>
      </div>
    )
  }

  const { standings, hasBonus } = data
  const lastIdx = standings.length - 1

  return (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-inset">
              <th className="text-left py-2.5 px-3 text-xs font-medium text-text-muted w-8">#</th>
              <th className="text-left py-2.5 px-3 text-xs font-medium text-text-muted">Team</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-8">P</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-8">W</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-8">D</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-8">L</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-10 hidden sm:table-cell">PF</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-10 hidden sm:table-cell">PA</th>
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-10">PD</th>
              {hasBonus && (
                <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-8">BP</th>
              )}
              <th className="text-center py-2.5 px-2 text-xs font-medium text-text-muted w-10">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.teamCode}
                className={`border-b border-border last:border-b-0 ${
                  i === 0 ? 'bg-surface' : i === lastIdx ? 'bg-surface' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-text-muted font-medium">{s.rank}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    {s.logoUrl && (
                      <img src={s.logoUrl} alt="" className="w-5 h-5 rounded-sm object-contain" />
                    )}
                    <span className="text-text-primary font-medium">{s.teamName}</span>
                  </div>
                </td>
                <td className="text-center py-2.5 px-2 text-text-secondary">{s.gamesPlayed}</td>
                <td className="text-center py-2.5 px-2 text-text-secondary">{s.won}</td>
                <td className="text-center py-2.5 px-2 text-text-secondary">{s.drawn}</td>
                <td className="text-center py-2.5 px-2 text-text-secondary">{s.lost}</td>
                <td className="text-center py-2.5 px-2 text-text-secondary hidden sm:table-cell">{s.pointsFor}</td>
                <td className="text-center py-2.5 px-2 text-text-secondary hidden sm:table-cell">{s.pointsAgainst}</td>
                <td className={`text-center py-2.5 px-2 font-medium ${
                  s.pointsDifference > 0 ? 'text-success-text' : s.pointsDifference < 0 ? 'text-danger-text' : 'text-text-muted'
                }`}>
                  {s.pointsDifference > 0 ? '+' : ''}{s.pointsDifference}
                </td>
                {hasBonus && (
                  <td className="text-center py-2.5 px-2 text-text-secondary">{s.bonusPoints}</td>
                )}
                <td className="text-center py-2.5 px-2 text-text-primary font-bold">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-text-muted">
          {data.source === 'espn' ? 'Source: ESPN' : 'W=4pts, D=2pts, L=0pts'}
        </p>
      </div>
    </div>
  )
}
