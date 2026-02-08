'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

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
}: Props) {
  const router = useRouter()
  const [expandedConf, setExpandedConf] = useState<string | null>(null)

  const handleWeekChange = (week: number) => {
    router.push(`/leagues/${leagueId}/stats?week=${week}`)
  }

  const rankings = apRankings as ApRanking[] | null
  const heisman = heismanWinner as HeismanWinner | null
  const heismanSchool = heisman?.schools
    ? (Array.isArray(heisman.schools) ? heisman.schools[0] : heisman.schools)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Fantasy Sports Platform
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/leagues/${leagueId}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {leagueName}
            </Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              My Leagues
            </Link>
          </div>
        </div>
      </header>

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
            &larr; Back to League
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* AP Top 25 with Week Dropdown */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-blue-400">📊</span>
                AP Top 25
              </h2>
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
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {rankings.map((ranking) => {
                  const movement = ranking.previous_rank
                    ? ranking.previous_rank - ranking.rank
                    : 0
                  const school = Array.isArray(ranking.schools) ? ranking.schools[0] : ranking.schools

                  return (
                    <div
                      key={ranking.school_id}
                      className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm w-6 text-right">
                          {ranking.rank}
                        </span>
                        {school?.logo_url ? (
                          <img
                            src={school.logo_url}
                            alt=""
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-600 rounded-full" />
                        )}
                        <div>
                          <span className="text-white text-sm">{school?.name}</span>
                          <span className="text-gray-500 text-xs ml-2">
                            {school?.conference}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {movement !== 0 && (
                          <span
                            className={`text-xs ${
                              movement > 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {movement > 0 ? `▲${movement}` : `▼${Math.abs(movement)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No AP rankings available for Week {selectedWeek}.</p>
            )}
          </div>

          {/* Conference Standings */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-orange-400">🏆</span>
              Conference Standings
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {conferenceStandings.map((conf) => (
                <div key={conf.conference} className="bg-gray-700/30 rounded overflow-hidden">
                  <button
                    onClick={() => setExpandedConf(expandedConf === conf.conference ? null : conf.conference)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{conf.conference}</span>
                      <span className="text-gray-400 text-sm">
                        ({conf.schools.length} teams)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-medium">
                        {conf.totalWins}-{conf.totalLosses}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedConf === conf.conference ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedConf === conf.conference && (
                    <div className="border-t border-gray-700 p-2 space-y-1">
                      {conf.schools.map((school, idx) => (
                        <div
                          key={school.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-700/30 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-4">{idx + 1}.</span>
                            {school.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-gray-600 rounded-full" />
                            )}
                            <span className="text-white text-sm">{school.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white text-sm font-medium">
                              {school.wins}-{school.losses}
                            </span>
                            <span className="text-gray-500 text-xs ml-2">
                              ({school.confWins}-{school.confLosses})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Heisman */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">🏈</span>
              Heisman Trophy
            </h2>
            {heisman ? (
              <div className="flex items-center gap-4 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                {heismanSchool?.logo_url ? (
                  <img
                    src={heismanSchool.logo_url}
                    alt=""
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-600 rounded-full" />
                )}
                <div>
                  <p className="text-yellow-400 text-lg font-bold">
                    {heisman.player_name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {heismanSchool?.name}
                  </p>
                  {heisman.awarded_at && (
                    <p className="text-gray-500 text-xs mt-1">
                      Awarded: {new Date(heisman.awarded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-700/30 rounded-lg text-center">
                <p className="text-gray-400 mb-2">Heisman Trophy Ceremony</p>
                <p className="text-white text-lg font-semibold">December 14, {year}</p>
                <p className="text-gray-500 text-sm mt-2">Winner to be announced</p>
              </div>
            )}
          </div>

          {/* Ideal Team */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-green-400">⭐</span>
              Ideal Team
            </h2>
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
                <div className="space-y-2 max-h-64 overflow-y-auto">
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

          {/* Weekly Maximum Points */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-blue-400">📈</span>
              Weekly Maximum Points
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Best possible points per week with a {schoolsPerTeam}-school roster
            </p>
            {statsData?.weeklyMaxPoints ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700/50">
                      <th className="px-3 py-2 text-left text-gray-400 font-medium text-sm">Week</th>
                      <th className="px-3 py-2 text-right text-gray-400 font-medium text-sm">Max Points</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium text-sm">Top Schools</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.weeklyMaxPoints.map((weekData) => (
                      <tr key={weekData.week} className="border-t border-gray-700/50">
                        <td className="px-3 py-2 text-white">Week {weekData.week}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-blue-400 font-semibold">{weekData.maxPoints}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-sm">
                          {weekData.topSchools.slice(0, 3).map(s => s.name).join(', ')}
                          {weekData.topSchools.length > 3 && '...'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Loading weekly data...</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
