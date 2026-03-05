'use client'

import { useState } from 'react'

// V2 types
interface WeeklyPoint {
  week: number
  label: string
  points: number
}

interface RosterEntry {
  school: string
  conference: string
  record: string
  points: number
}

interface StandingV2 {
  rank: number
  teamName: string
  userName: string
  totalPoints: number
  winnings: number
  teamId: string | null
  userId: string | null
  weeklyPoints: WeeklyPoint[]
  roster: RosterEntry[]
}

interface HighPointsWinner {
  week: number
  label: string
  highPoints: number
  winners: string[]
}

interface SeasonNotes {
  entryFee?: number
  totalPrizePool?: number
  heismanWinner?: string
  nationalChampion?: string
}

interface V2Data {
  version: 2
  standings: StandingV2[]
  highPointsWinners: HighPointsWinner[]
  seasonNotes: SeasonNotes
}

// V1 types (backward compat)
interface StandingV1 {
  rank: number
  teamName: string
  userName: string
  totalPoints: number
}

interface HistorySeasonCardProps {
  seasonYear: number
  finalStandings: V2Data | StandingV1[]
  championName: string | null
  championUserName: string | null
  archivedAt: string
  defaultExpanded?: boolean
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${className || ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function isV2(data: V2Data | StandingV1[]): data is V2Data {
  return !Array.isArray(data) && typeof data === 'object' && 'version' in data && data.version === 2
}

function shortenLabel(label: string): string {
  return label
    .replace('Week ', 'W')
    .replace('Conf Championships', 'CC')
    .replace('Bowl Appearance', 'Bowl')
    .replace('Heisman Winner', 'Heis')
    .replace('Bowl Scores', 'BS')
    .replace('Playoff Appearance', 'PO')
    .replace('National Championship', 'NC')
}

export function HistorySeasonCard({
  seasonYear,
  finalStandings,
  championName,
  championUserName,
  archivedAt,
  defaultExpanded = false,
}: HistorySeasonCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showWeekly, setShowWeekly] = useState(false)
  const [showHighPoints, setShowHighPoints] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null)

  const v2 = isV2(finalStandings)
  const standings = v2 ? finalStandings.standings : finalStandings
  const highPointsWinners = v2 ? finalStandings.highPointsWinners : []
  const notes = v2 ? finalStandings.seasonNotes : null

  return (
    <div id={`season-${seasonYear}`} className="bg-surface rounded-lg overflow-hidden">
      {/* Collapsible Season Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 md:px-6 py-4 flex items-center justify-between hover:bg-surface-subtle transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-text-primary">
            {seasonYear - 1}-{seasonYear} Season
          </h2>
          {championName && (
            <div className="flex items-center gap-2 bg-warning/10 px-3 py-1.5 rounded-full">
              <span className="text-base">🏆</span>
              <span className="text-sm font-semibold text-warning-text">
                {championUserName || championName}
              </span>
            </div>
          )}
        </div>
        <ChevronIcon open={isExpanded} className="shrink-0 text-text-muted" />
      </button>

      {isExpanded && (
        <>
          {/* Season Notes */}
          {notes && (
            <div className="px-4 md:px-6 pb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted border-t border-border pt-3">
              {notes.totalPrizePool != null && notes.totalPrizePool > 0 && (
                <span>Prize Pool: <span className="text-success-text font-medium">${notes.totalPrizePool}</span></span>
              )}
              {notes.nationalChampion && (
                <span>National Champion: <span className="text-text-secondary font-medium">{notes.nationalChampion}</span></span>
              )}
              {notes.heismanWinner && (
                <span>Heisman: <span className="text-text-secondary font-medium">{notes.heismanWinner}</span></span>
              )}
            </div>
          )}

          {/* Standings Table */}
          <div className="px-4 md:px-6 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary text-xs uppercase">
                  <th className="text-left py-2 w-12">#</th>
                  <th className="text-left py-2">Team</th>
                  <th className="text-left py-2 hidden sm:table-cell">Owner</th>
                  <th className="text-right py-2">Points</th>
                  {v2 && <th className="text-right py-2">Winnings</th>}
                </tr>
              </thead>
              <tbody>
                {standings.map((team, idx) => {
                  const isChamp = idx === 0
                  const teamV2 = v2 ? (team as StandingV2) : null
                  const isTeamExpanded = expandedTeam === idx

                  return (
                    <tr
                      key={teamV2?.teamId || idx}
                      className={`border-t border-border/50 ${isChamp ? 'bg-warning/5' : ''} ${
                        teamV2?.roster ? 'cursor-pointer hover:bg-surface-subtle' : ''
                      }`}
                      onClick={() => teamV2?.roster && setExpandedTeam(isTeamExpanded ? null : idx)}
                    >
                      <td className="py-2.5 text-text-secondary">
                        {isChamp ? '🏆' : team.rank}
                      </td>
                      <td className="py-2.5">
                        <span className="text-text-primary font-medium">{team.teamName}</span>
                        <span className="text-text-muted sm:hidden text-xs ml-1">({team.userName})</span>
                      </td>
                      <td className="py-2.5 text-text-secondary hidden sm:table-cell">
                        {team.userName}
                      </td>
                      <td className="py-2.5 text-text-primary text-right font-mono">
                        {team.totalPoints}
                      </td>
                      {v2 && (
                        <td className="py-2.5 text-right font-mono">
                          {teamV2 && teamV2.winnings > 0 ? (
                            <span className="text-success-text">${teamV2.winnings.toFixed(2)}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Expanded Team Roster */}
            {expandedTeam !== null && v2 && (finalStandings.standings[expandedTeam]?.roster?.length ?? 0) > 0 && (
              <div className="mt-2 mb-3 ml-4 bg-surface-subtle rounded-lg p-3">
                <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                  {finalStandings.standings[expandedTeam].teamName} Roster
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {finalStandings.standings[expandedTeam].roster.map((school) => (
                    <div key={school.school} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-surface">
                      <div>
                        <span className="text-text-primary font-medium">{school.school}</span>
                        <span className="text-text-muted ml-1.5">{school.conference}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">{school.record}</span>
                        <span className="text-text-primary font-mono font-medium w-8 text-right">{school.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Detail Sections */}
          {v2 && (
            <div className="border-t border-border">
              {/* Weekly Breakdown Toggle */}
              <button
                onClick={() => setShowWeekly(!showWeekly)}
                className="w-full flex items-center justify-between px-4 md:px-6 py-3 text-sm text-text-secondary hover:bg-surface-subtle transition-colors"
              >
                <span className="font-medium">Weekly Breakdown</span>
                <ChevronIcon open={showWeekly} />
              </button>

              {showWeekly && (
                <div className="px-4 md:px-6 pb-4 overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="text-text-muted">
                        <th className="text-left py-1.5 sticky left-0 bg-surface font-medium">Team</th>
                        {finalStandings.standings[0]?.weeklyPoints.map(wp => (
                          <th key={wp.week} className="text-center py-1.5 px-1 font-normal whitespace-nowrap">
                            {shortenLabel(wp.label)}
                          </th>
                        ))}
                        <th className="text-right py-1.5 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalStandings.standings.map((team, teamIdx) => (
                        <tr key={teamIdx} className={`border-t border-border/30 ${teamIdx === 0 ? 'bg-warning/5' : ''}`}>
                          <td className="py-1.5 pr-2 text-text-primary font-medium sticky left-0 bg-surface whitespace-nowrap">
                            {team.teamName}
                          </td>
                          {team.weeklyPoints.map((wp) => {
                            const isHP = highPointsWinners.find(
                              h => h.week === wp.week && h.winners.includes(team.teamName)
                            )
                            return (
                              <td
                                key={wp.week}
                                className={`text-center py-1.5 px-1 font-mono ${
                                  isHP ? 'text-warning-text font-bold' : 'text-text-secondary'
                                }`}
                              >
                                {wp.points}
                              </td>
                            )
                          })}
                          <td className="py-1.5 text-right font-mono text-text-primary font-medium">
                            {team.totalPoints}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-text-muted mt-2">
                    Highlighted values indicate weekly high points winner(s)
                  </p>
                </div>
              )}

              {/* High Points Grid Toggle */}
              {highPointsWinners.length > 0 && (
                <>
                  <button
                    onClick={() => setShowHighPoints(!showHighPoints)}
                    className="w-full flex items-center justify-between px-4 md:px-6 py-3 text-sm text-text-secondary hover:bg-surface-subtle transition-colors border-t border-border"
                  >
                    <span className="font-medium">High Points Awards</span>
                    <ChevronIcon open={showHighPoints} />
                  </button>

                  {showHighPoints && (() => {
                    // Build prize lookup: for each week, map teamName → prize amount
                    const prizeLookup = new Map<number, Map<string, number>>()
                    for (const hp of highPointsWinners) {
                      const prizePerWinner = 5 / hp.winners.length
                      const weekMap = new Map<string, number>()
                      for (const winner of hp.winners) {
                        weekMap.set(winner, prizePerWinner)
                      }
                      prizeLookup.set(hp.week, weekMap)
                    }

                    // Compute total prizes per team
                    const teamTotals = new Map<string, number>()
                    for (const team of finalStandings.standings) {
                      let total = 0
                      for (const [, weekMap] of prizeLookup) {
                        total += weekMap.get(team.teamName) || 0
                      }
                      teamTotals.set(team.teamName, total)
                    }

                    return (
                      <div className="px-4 md:px-6 pb-4 overflow-x-auto">
                        <table className="w-full text-xs min-w-[600px]">
                          <thead>
                            <tr className="text-text-muted">
                              <th className="text-left py-1.5 sticky left-0 bg-surface font-medium">Team</th>
                              {highPointsWinners.map(hp => (
                                <th key={hp.week} className="text-center py-1.5 px-1 font-normal whitespace-nowrap">
                                  {shortenLabel(hp.label)}
                                </th>
                              ))}
                              <th className="text-right py-1.5 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {finalStandings.standings.map((team, teamIdx) => {
                              const totalPrize = teamTotals.get(team.teamName) || 0
                              return (
                                <tr key={teamIdx} className={`border-t border-border/30 ${teamIdx === 0 ? 'bg-warning/5' : ''}`}>
                                  <td className="py-1.5 pr-2 text-text-primary font-medium sticky left-0 bg-surface whitespace-nowrap">
                                    {team.teamName}
                                  </td>
                                  {highPointsWinners.map((hp) => {
                                    const prize = prizeLookup.get(hp.week)?.get(team.teamName)
                                    return (
                                      <td
                                        key={hp.week}
                                        className={`text-center py-1.5 px-1 font-mono ${
                                          prize ? 'text-success-text font-bold' : 'text-text-muted'
                                        }`}
                                      >
                                        {prize ? `$${prize.toFixed(2)}` : '—'}
                                      </td>
                                    )
                                  })}
                                  <td className="py-1.5 text-right font-mono font-medium text-success-text">
                                    {totalPrize > 0 ? `$${totalPrize.toFixed(2)}` : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <p className="text-[10px] text-text-muted mt-2">
                          $5.00 per week, split among tied winners
                        </p>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {/* School MVP */}
          {v2 && (() => {
            // Show each school's actual points (not aggregated across teams)
            const schoolPoints = new Map<string, { points: number; conference: string; record: string; teams: string[] }>()
            for (const team of finalStandings.standings) {
              for (const school of team.roster) {
                if (!school.points) continue
                const existing = schoolPoints.get(school.school)
                if (existing) {
                  // Same school on multiple rosters — keep the points as-is (same real-world performance)
                  existing.teams.push(team.teamName)
                } else {
                  schoolPoints.set(school.school, {
                    points: school.points,
                    conference: school.conference,
                    record: school.record,
                    teams: [team.teamName],
                  })
                }
              }
            }
            const topSchools = [...schoolPoints.entries()]
              .sort(([, a], [, b]) => b.points - a.points)
              .slice(0, 5)

            if (topSchools.length === 0) return null

            return (
              <div className="px-4 md:px-6 py-3 border-t border-border">
                <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Season School MVP</h3>
                <div className="space-y-1.5">
                  {topSchools.map(([name, data], i) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${i === 0 ? 'text-warning-text' : 'text-text-muted'}`}>
                          {i === 0 ? '⭐' : `${i + 1}.`}
                        </span>
                        <span className="text-text-primary font-medium">{name}</span>
                        <span className="text-text-muted">{data.conference}</span>
                        {data.record && <span className="text-text-secondary">({data.record})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted text-[10px]">
                          {data.teams.length > 1 ? `${data.teams.length} teams` : data.teams[0]}
                        </span>
                        <span className="font-mono font-medium text-text-primary">{data.points} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Footer */}
          <div className="px-4 md:px-6 py-3 border-t border-border bg-surface-subtle">
            <p className="text-text-muted text-xs">
              Archived on {new Date(archivedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {v2 && <span className="ml-2">• Click a team row to see their roster</span>}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
