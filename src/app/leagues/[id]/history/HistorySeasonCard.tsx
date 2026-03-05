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
  archivedAt: string
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
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

export function HistorySeasonCard({ seasonYear, finalStandings, championName, archivedAt }: HistorySeasonCardProps) {
  const [showWeekly, setShowWeekly] = useState(false)
  const [showHighPoints, setShowHighPoints] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null)

  const v2 = isV2(finalStandings)
  const standings = v2 ? finalStandings.standings : finalStandings
  const highPointsWinners = v2 ? finalStandings.highPointsWinners : []
  const notes = v2 ? finalStandings.seasonNotes : null

  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      {/* Season Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-text-primary">
            {seasonYear - 1}-{seasonYear} Season
          </h2>
          {championName && (
            <div className="flex items-center gap-2 bg-warning/10 px-3 py-1.5 rounded-full">
              <span className="text-base">🏆</span>
              <span className="text-sm font-semibold text-warning-text">
                {championName}
              </span>
            </div>
          )}
        </div>
        {notes && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
            {notes.totalPrizePool != null && (
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
      </div>

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
              const isExpanded = expandedTeam === idx

              return (
                <tr
                  key={teamV2?.teamId || idx}
                  className={`border-t border-border/50 ${isChamp ? 'bg-warning/5' : ''} ${
                    teamV2?.roster ? 'cursor-pointer hover:bg-surface-subtle' : ''
                  }`}
                  onClick={() => teamV2?.roster && setExpandedTeam(isExpanded ? null : idx)}
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

      {/* Collapsible Sections */}
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
                        {wp.label.replace('Week ', 'W').replace('Conf Championships', 'CC').replace('Bowl Appearance', 'Bowl').replace('Heisman Winner', 'Heis').replace('Bowl Scores', 'BS').replace('Playoff Appearance', 'PO').replace('National Championship', 'NC')}
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
                        const isHighPoints = highPointsWinners.find(
                          h => h.week === wp.week && h.winners.includes(team.teamName)
                        )
                        return (
                          <td
                            key={wp.week}
                            className={`text-center py-1.5 px-1 font-mono ${
                              isHighPoints ? 'text-warning-text font-bold' : 'text-text-secondary'
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

          {/* High Points Toggle */}
          {highPointsWinners.length > 0 && (
            <>
              <button
                onClick={() => setShowHighPoints(!showHighPoints)}
                className="w-full flex items-center justify-between px-4 md:px-6 py-3 text-sm text-text-secondary hover:bg-surface-subtle transition-colors border-t border-border"
              >
                <span className="font-medium">High Points Awards</span>
                <ChevronIcon open={showHighPoints} />
              </button>

              {showHighPoints && (
                <div className="px-4 md:px-6 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {highPointsWinners.map(hp => (
                      <div key={hp.week} className="flex items-center justify-between bg-surface-subtle rounded px-3 py-2 text-xs">
                        <div>
                          <span className="text-text-muted">{hp.label}</span>
                          <span className="text-text-primary font-medium ml-2">{hp.winners.join(', ')}</span>
                        </div>
                        <span className="text-warning-text font-mono font-medium ml-2 shrink-0">{hp.highPoints}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
    </div>
  )
}
