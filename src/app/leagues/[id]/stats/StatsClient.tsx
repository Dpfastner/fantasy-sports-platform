'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

        {/* Conference Standings - Main Feature */}
        <section className="mb-10">
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

        {/* Secondary Stats Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-blue-400">📊</span>
            Additional Stats
          </h2>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* AP Top 25 with Week Dropdown */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AP Top 25</h3>
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
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-2">No AP rankings available for Week {selectedWeek}.</p>
                  <p className="text-gray-600 text-xs">Rankings are synced weekly from ESPN.</p>
                </div>
              )}
            </div>

            {/* Ideal Team */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Ideal Team</h3>
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

            {/* Heisman */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">🏈</span>
                Heisman Trophy
              </h3>
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
                  <p className="text-gray-600 text-xs mt-3">
                    Data will be populated after the ceremony.
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Maximum Points */}
            <div className="bg-gray-800 rounded-lg p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Maximum Points</h3>
              <p className="text-gray-400 text-sm mb-4">
                Best possible points per week with a {schoolsPerTeam}-school roster
              </p>
              {statsData?.weeklyMaxPoints ? (
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-800">
                      <tr className="bg-gray-700/50">
                        <th className="px-3 py-2 text-left text-gray-400 font-medium text-sm">Week</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium text-sm">Max</th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium text-sm">Top Schools</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.weeklyMaxPoints.map((weekData) => (
                        <tr key={weekData.week} className="border-t border-gray-700/50">
                          <td className="px-3 py-2 text-white text-sm">W{weekData.week}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-blue-400 font-semibold text-sm">{weekData.maxPoints}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-400 text-xs">
                            {weekData.topSchools.slice(0, 2).map(s => s.name).join(', ')}...
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
        </section>
      </main>
    </div>
  )
}
