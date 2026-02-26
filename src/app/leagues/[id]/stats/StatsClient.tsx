'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'

interface SchoolRecord {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  wins: number
  losses: number
  confWins: number
  confLosses: number
}

interface ConferenceStanding {
  conference: string
  schools: SchoolRecord[]
  totalWins: number
  totalLosses: number
}

interface ApRanking {
  school_id: string
  week_number: number
  rank: number
  previous_rank: number | null
  schools: {
    name: string
    logo_url: string | null
    conference: string
  } | {
    name: string
    logo_url: string | null
    conference: string
  }[] | null
}

interface HeismanWinner {
  id: string
  school_id: string
  player_name: string
  awarded_at: string
  schools: {
    name: string
    logo_url: string | null
  } | {
    name: string
    logo_url: string | null
  }[] | null
}

interface SchoolStats {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  total_points: number
  weeks_with_points: number
}

interface StatsData {
  idealTeam: {
    schools: SchoolStats[]
    totalPoints: number
  }
  currentWeekMax: {
    week: number
    maxPoints: number
    topSchools: Array<{ id: string; name: string; points: number }>
  }
  weeklyMaxPoints: Array<{
    week: number
    maxPoints: number
    topSchools: Array<{ id: string; name: string; points: number }>
  }>
}

interface Props {
  leagueId: string
  leagueName: string
  seasonName: string
  year: number
  currentWeek: number
  selectedWeek: number
  availableWeeks: number[]
  schoolsPerTeam: number
  conferenceStandings: ConferenceStanding[]
  apRankings: unknown
  heismanWinner: unknown
  statsData: StatsData | null
  userName?: string | null
  userEmail?: string | null
}

export default function StatsClient({
  leagueId,
  leagueName,
  seasonName,
  year,
  currentWeek,
  selectedWeek,
  availableWeeks,
  schoolsPerTeam,
  conferenceStandings,
  apRankings,
  heismanWinner,
  statsData,
  userName,
  userEmail,
}: Props) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<'standings' | 'stats'>('standings')

  const handleWeekChange = (week: number) => {
    router.push(`/leagues/${leagueId}/stats?week=${week}`)
  }

  const rankings = apRankings as ApRanking[] | null
  const heisman = heismanWinner as HeismanWinner | null
  const heismanSchool = heisman?.schools
    ? (Array.isArray(heisman.schools) ? heisman.schools[0] : heisman.schools)
    : null

  // Sort conferences alphabetically
  const sortedConferences = [...conferenceStandings].sort((a, b) =>
    a.conference.localeCompare(b.conference)
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={userName} userEmail={userEmail}>
        <Link
          href={`/leagues/${leagueId}/team`}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          My Roster
        </Link>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          {leagueName}
        </Link>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-1">League Stats</h1>
          <p className="text-text-secondary">{seasonName} - Week {currentWeek}</p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border">
          <Link
            href={`/leagues/${leagueId}`}
            className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Home
          </Link>
          <Link
            href={`/leagues/${leagueId}/schedule`}
            className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Schedule
          </Link>
          <Link
            href={`/leagues/${leagueId}/transactions`}
            className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Add/Drop
          </Link>
        </div>

        {/* Section Toggle */}
        <div className="flex mb-6">
          <button
            onClick={() => setActiveSection('standings')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-l-lg transition-colors ${
              activeSection === 'standings'
                ? 'bg-accent text-text-primary'
                : 'bg-surface text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            Conference Standings
          </button>
          <button
            onClick={() => setActiveSection('stats')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
              activeSection === 'stats'
                ? 'bg-brand text-text-primary'
                : 'bg-surface text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            AP Top 25 / Heisman / Ideal Team / Weekly Max
          </button>
        </div>

        {/* Section 1: Conference Standings Only */}
        {activeSection === 'standings' && (
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center gap-2">
              <span className="text-accent-text">🏆</span>
              Conference Standings
            </h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedConferences.map((conf) => (
                <div key={conf.conference} className="bg-surface rounded-lg overflow-hidden">
                  {/* Conference Header */}
                  <div className="bg-surface-inset px-4 py-3 flex justify-between items-center">
                    <h3 className="text-text-primary font-semibold">{conf.conference}</h3>
                    <span className="text-success-text font-medium text-sm">
                      {conf.totalWins}-{conf.totalLosses}
                    </span>
                  </div>

                  {/* Schools Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-subtle text-xs">
                          <th className="px-3 py-2 text-left text-text-secondary">#</th>
                          <th className="px-3 py-2 text-left text-text-secondary">Team</th>
                          <th className="px-3 py-2 text-center text-text-secondary">Conf</th>
                          <th className="px-3 py-2 text-center text-text-secondary">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conf.schools.map((school, idx) => (
                          <tr key={school.id} className="border-t border-border-subtle hover:bg-surface-subtle">
                            <td className="px-3 py-2 text-text-muted text-sm">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {school.logo_url ? (
                                  <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                                ) : (
                                  <div className="w-5 h-5 bg-surface-subtle rounded-full" />
                                )}
                                <span className="text-text-primary text-sm truncate max-w-[120px]">{school.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-text-primary text-sm font-medium">
                                {school.confWins}-{school.confLosses}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-sm ${school.wins > school.losses ? 'text-success-text' : school.wins < school.losses ? 'text-danger-text' : 'text-text-secondary'}`}>
                                {school.wins}-{school.losses}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: AP Top 25, Heisman, Ideal Team, Weekly Maximum */}
        {activeSection === 'stats' && (
          <section>
            {/* Heisman Banner - Full Width */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 md:p-5 mb-6">
              {heisman ? (
                <div className="flex items-center gap-4">
                  <span className="text-warning-text text-2xl md:text-3xl">🏆</span>
                  {heismanSchool?.logo_url && (
                    <img src={heismanSchool.logo_url} alt="" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
                  )}
                  <div className="flex-1">
                    <p className="text-warning-text font-bold text-lg md:text-xl">
                      Heisman Winner: {heisman.player_name}
                    </p>
                    <p className="text-text-secondary text-sm md:text-base">{heismanSchool?.name}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-warning-text text-2xl md:text-3xl">🏆</span>
                  <div>
                    <p className="text-warning-text font-bold text-lg md:text-xl">Heisman Trophy</p>
                    <p className="text-text-secondary text-sm">Ceremony: December 14, {year}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AP Top 25 - Full Width */}
            <div className="bg-surface rounded-lg p-4 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <span className="text-brand-text">📊</span>
                  AP Top 25
                </h3>
                <select
                  value={selectedWeek}
                  onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                  className="bg-surface text-text-primary text-sm rounded-lg px-3 py-1.5 border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {availableWeeks.length > 0 ? (
                    availableWeeks.map((week) => (
                      <option key={week} value={week}>
                        Week {week}
                      </option>
                    ))
                  ) : (
                    <option value={currentWeek}>Week {currentWeek}</option>
                  )}
                </select>
              </div>
              {rankings && rankings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Ranks 1-10 */}
                  <div className="space-y-2">
                    {rankings.filter(r => r.rank >= 1 && r.rank <= 10).map((ranking) => {
                      const movement = ranking.previous_rank
                        ? ranking.previous_rank - ranking.rank
                        : 0
                      const school = Array.isArray(ranking.schools) ? ranking.schools[0] : ranking.schools

                      return (
                        <div
                          key={ranking.school_id}
                          className="flex items-center justify-between p-2 bg-surface-subtle rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary text-sm w-5 text-right font-medium">
                              {ranking.rank}
                            </span>
                            {school?.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-surface-subtle rounded-full" />
                            )}
                            <span className="text-text-primary text-sm truncate">{school?.name}</span>
                          </div>
                          {movement !== 0 && (
                            <span className={`text-xs ${movement > 0 ? 'text-success-text' : 'text-danger-text'}`}>
                              {movement > 0 ? `▲${movement}` : `▼${Math.abs(movement)}`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Column 2: Ranks 11-20 */}
                  <div className="space-y-2">
                    {rankings.filter(r => r.rank >= 11 && r.rank <= 20).map((ranking) => {
                      const movement = ranking.previous_rank
                        ? ranking.previous_rank - ranking.rank
                        : 0
                      const school = Array.isArray(ranking.schools) ? ranking.schools[0] : ranking.schools

                      return (
                        <div
                          key={ranking.school_id}
                          className="flex items-center justify-between p-2 bg-surface-subtle rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary text-sm w-5 text-right font-medium">
                              {ranking.rank}
                            </span>
                            {school?.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-surface-subtle rounded-full" />
                            )}
                            <span className="text-text-primary text-sm truncate">{school?.name}</span>
                          </div>
                          {movement !== 0 && (
                            <span className={`text-xs ${movement > 0 ? 'text-success-text' : 'text-danger-text'}`}>
                              {movement > 0 ? `▲${movement}` : `▼${Math.abs(movement)}`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Column 3: Ranks 21-25 */}
                  <div className="space-y-2">
                    {rankings.filter(r => r.rank >= 21 && r.rank <= 25).map((ranking) => {
                      const movement = ranking.previous_rank
                        ? ranking.previous_rank - ranking.rank
                        : 0
                      const school = Array.isArray(ranking.schools) ? ranking.schools[0] : ranking.schools

                      return (
                        <div
                          key={ranking.school_id}
                          className="flex items-center justify-between p-2 bg-surface-subtle rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary text-sm w-5 text-right font-medium">
                              {ranking.rank}
                            </span>
                            {school?.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-surface-subtle rounded-full" />
                            )}
                            <span className="text-text-primary text-sm truncate">{school?.name}</span>
                          </div>
                          {movement !== 0 && (
                            <span className={`text-xs ${movement > 0 ? 'text-success-text' : 'text-danger-text'}`}>
                              {movement > 0 ? `▲${movement}` : `▼${Math.abs(movement)}`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-muted text-sm mb-2">No AP rankings available for Week {selectedWeek}.</p>
                  <p className="text-text-muted text-xs">Rankings are synced weekly from ESPN.</p>
                </div>
              )}
            </div>

            {/* Ideal Team + Weekly Max - Side by Side */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Ideal Team */}
              <div className="bg-surface rounded-lg p-4 md:p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <span className="text-success-text">⭐</span>
                  Ideal Team
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Best possible {schoolsPerTeam}-school roster based on season results
                </p>
                {statsData?.idealTeam ? (
                  <>
                    <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-center">
                      <span className="text-3xl font-bold text-success-text">
                        {statsData.idealTeam.totalPoints.toLocaleString()}
                      </span>
                      <span className="text-text-secondary ml-2">total points</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {statsData.idealTeam.schools.map((school, idx) => (
                        <div
                          key={school.id}
                          className="flex items-center justify-between p-2 bg-surface-subtle rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted text-sm w-5">{idx + 1}.</span>
                            {school.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <div className="w-6 h-6 bg-surface-subtle rounded-full" />
                            )}
                            <span className="text-text-primary text-sm">{school.name}</span>
                          </div>
                          <span className="text-success-text font-medium">{school.total_points}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-text-muted text-sm">Loading ideal team data...</p>
                )}
              </div>

              {/* Weekly Maximum Points - Selected Week */}
              <div className="bg-surface rounded-lg p-4 md:p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <span className="text-brand-text">📈</span>
                  Week {selectedWeek} Maximum
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Best {schoolsPerTeam} schools for Week {selectedWeek}
                </p>
                {statsData?.weeklyMaxPoints ? (() => {
                  const selectedWeekData = statsData.weeklyMaxPoints.find(w => w.week === selectedWeek)
                  if (!selectedWeekData) {
                    return <p className="text-text-muted text-sm">No data for Week {selectedWeek}</p>
                  }
                  return (
                    <>
                      <div className="mb-4 p-3 bg-highlight-row border border-brand/30 rounded-lg text-center">
                        <span className="text-3xl font-bold text-brand-text">
                          {selectedWeekData.maxPoints.toLocaleString()}
                        </span>
                        <span className="text-text-secondary text-sm ml-2">pts</span>
                      </div>
                      <div className="space-y-2">
                        {selectedWeekData.topSchools.slice(0, schoolsPerTeam).map((school, idx) => (
                          <div key={school.id} className="flex items-center justify-between p-2 bg-surface-subtle rounded">
                            <div className="flex items-center gap-3">
                              <span className="text-text-muted text-sm w-5">{idx + 1}.</span>
                              <span className="text-text-primary text-sm">{school.name}</span>
                            </div>
                            <span className="text-brand-text font-medium">{school.points}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })() : (
                  <p className="text-text-muted text-sm">Loading weekly data...</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
