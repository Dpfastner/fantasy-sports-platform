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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Header userName={userName} userEmail={userEmail}>
        <Link
          href={`/leagues/${leagueId}/team`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          My Roster
        </Link>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {leagueName}
        </Link>
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">League Stats</h1>
          <p className="text-gray-400">{seasonName} - Week {currentWeek}</p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-700">
          <Link
            href={`/leagues/${leagueId}`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Home
          </Link>
          <Link
            href={`/leagues/${leagueId}/schedule`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Schedule
          </Link>
          <Link
            href={`/leagues/${leagueId}/transactions`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
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
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Conference Standings
          </button>
          <button
            onClick={() => setActiveSection('stats')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
              activeSection === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            AP Top 25 / Heisman / Ideal Team / Weekly Max
          </button>
        </div>

        {/* Section 1: Conference Standings Only */}
        {activeSection === 'standings' && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-orange-400">🏆</span>
              Conference Standings
            </h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedConferences.map((conf) => (
                <div key={conf.conference} className="bg-gray-800 rounded-lg overflow-hidden">
                  {/* Conference Header */}
                  <div className="bg-gray-700/50 px-4 py-3 flex justify-between items-center">
                    <h3 className="text-white font-semibold">{conf.conference}</h3>
                    <span className="text-green-400 font-medium text-sm">
                      {conf.totalWins}-{conf.totalLosses}
                    </span>
                  </div>

                  {/* Schools Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-700/30 text-xs">
                          <th className="px-3 py-2 text-left text-gray-400">#</th>
                          <th className="px-3 py-2 text-left text-gray-400">Team</th>
                          <th className="px-3 py-2 text-center text-gray-400">Conf</th>
                          <th className="px-3 py-2 text-center text-gray-400">Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conf.schools.map((school, idx) => (
                          <tr key={school.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                            <td className="px-3 py-2 text-gray-500 text-sm">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {school.logo_url ? (
                                  <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                                ) : (
                                  <div className="w-5 h-5 bg-gray-600 rounded-full" />
                                )}
                                <span className="text-white text-sm truncate max-w-[120px]">{school.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-white text-sm font-medium">
                                {school.confWins}-{school.confLosses}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-sm ${school.wins > school.losses ? 'text-green-400' : school.wins < school.losses ? 'text-red-400' : 'text-gray-400'}`}>
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
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 md:p-5 mb-6">
              {heisman ? (
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 text-2xl md:text-3xl">🏆</span>
                  {heismanSchool?.logo_url && (
                    <img src={heismanSchool.logo_url} alt="" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
                  )}
                  <div className="flex-1">
                    <p className="text-yellow-400 font-bold text-lg md:text-xl">
                      Heisman Winner: {heisman.player_name}
                    </p>
                    <p className="text-gray-300 text-sm md:text-base">{heismanSchool?.name}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-yellow-400 text-2xl md:text-3xl">🏆</span>
                  <div>
                    <p className="text-yellow-400 font-bold text-lg md:text-xl">Heisman Trophy</p>
                    <p className="text-gray-300 text-sm">Ceremony: December 14, {year}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AP Top 25 - Full Width */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-blue-400">📊</span>
                  AP Top 25
                </h3>
                <select
                  value={selectedWeek}
                  onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm w-5 text-right font-medium">
                              {ranking.rank}
                            </span>
                            {school?.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-gray-600 rounded-full" />
                            )}
                            <span className="text-white text-sm truncate">{school?.name}</span>
                          </div>
                          {movement !== 0 && (
                            <span className={`text-xs ${movement > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                          className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm w-5 text-right font-medium">
                              {ranking.rank}
                            </span>
                            {school?.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-gray-600 rounded-full" />
                            )}
                            <span className="text-white text-sm truncate">{school?.name}</span>
                          </div>
                          {movement !== 0 && (
                            <span className={`text-xs ${movement > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                          className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm w-5 text-right font-medium">
                              {ranking.rank}
                            </span>
                            {school?.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-gray-600 rounded-full" />
                            )}
                            <span className="text-white text-sm truncate">{school?.name}</span>
                          </div>
                          {movement !== 0 && (
                            <span className={`text-xs ${movement > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                  <p className="text-gray-500 text-sm mb-2">No AP rankings available for Week {selectedWeek}.</p>
                  <p className="text-gray-600 text-xs">Rankings are synced weekly from ESPN.</p>
                </div>
              )}
            </div>

            {/* Ideal Team + Weekly Max - Side by Side */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Ideal Team */}
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-green-400">⭐</span>
                  Ideal Team
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Best possible {schoolsPerTeam}-school roster based on season results
                </p>
                {statsData?.idealTeam ? (
                  <>
                    <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-center">
                      <span className="text-3xl font-bold text-green-400">
                        {statsData.idealTeam.totalPoints.toLocaleString()}
                      </span>
                      <span className="text-gray-400 ml-2">total points</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {statsData.idealTeam.schools.map((school, idx) => (
                        <div
                          key={school.id}
                          className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm w-5">{idx + 1}.</span>
                            {school.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <div className="w-6 h-6 bg-gray-600 rounded-full" />
                            )}
                            <span className="text-white text-sm">{school.name}</span>
                          </div>
                          <span className="text-green-400 font-medium">{school.total_points}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">Loading ideal team data...</p>
                )}
              </div>

              {/* Weekly Maximum Points - Selected Week */}
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-blue-400">📈</span>
                  Week {selectedWeek} Maximum
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Best {schoolsPerTeam} schools for Week {selectedWeek}
                </p>
                {statsData?.weeklyMaxPoints ? (() => {
                  const selectedWeekData = statsData.weeklyMaxPoints.find(w => w.week === selectedWeek)
                  if (!selectedWeekData) {
                    return <p className="text-gray-500 text-sm">No data for Week {selectedWeek}</p>
                  }
                  return (
                    <>
                      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-center">
                        <span className="text-3xl font-bold text-blue-400">
                          {selectedWeekData.maxPoints.toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm ml-2">pts</span>
                      </div>
                      <div className="space-y-2">
                        {selectedWeekData.topSchools.slice(0, schoolsPerTeam).map((school, idx) => (
                          <div key={school.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 text-sm w-5">{idx + 1}.</span>
                              <span className="text-white text-sm">{school.name}</span>
                            </div>
                            <span className="text-blue-400 font-medium">{school.points}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })() : (
                  <p className="text-gray-500 text-sm">Loading weekly data...</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
