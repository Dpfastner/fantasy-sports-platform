'use client'

interface School {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  primary_color: string
}

interface Game {
  id: string
  status: string
  game_date: string
  game_time: string | null
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  home_team_name: string | null
  away_team_name: string | null
  home_team_logo_url: string | null
  away_team_logo_url: string | null
  quarter: string | null
  clock: string | null
}

interface WeeklyPoints {
  week_number: number
  total_points: number
}

interface Props {
  index: number
  schoolId: string
  school: School
  game: Game | null
  weeklyPoints: WeeklyPoints[]
  totalPoints: number
  currentWeek: number
  doublePointsEnabled: boolean
  isDoublePointsPick: boolean
  canPickDoublePoints: boolean
  onDoublePointsSelect: (schoolId: string) => void
  expanded: boolean
}

export function RosterRow({
  index,
  schoolId,
  school,
  game,
  weeklyPoints,
  totalPoints,
  currentWeek,
  doublePointsEnabled,
  isDoublePointsPick,
  canPickDoublePoints,
  onDoublePointsSelect,
  expanded
}: Props) {
  // Get opponent info
  const isHome = game?.home_school_id === schoolId
  const opponentName = game ? (isHome ? game.away_team_name : game.home_team_name) : null
  const opponentLogo = game ? (isHome ? game.away_team_logo_url : game.home_team_logo_url) : null
  const opponentRank = game ? (isHome ? game.away_rank : game.home_rank) : null
  const myScore = game ? (isHome ? game.home_score : game.away_score) : null
  const oppScore = game ? (isHome ? game.away_score : game.home_score) : null

  // Build weekly points map
  const pointsByWeek = new Map<number, number>()
  for (const wp of weeklyPoints) {
    pointsByWeek.set(wp.week_number, wp.total_points)
  }

  // Get current week points
  const currentWeekPoints = pointsByWeek.get(currentWeek) || 0

  // Format game time
  const getGameTime = () => {
    if (!game) return null
    if (game.status === 'completed') return 'Final'
    if (game.status === 'live') return `Q${game.quarter} ${game.clock}`

    const gameDate = new Date(`${game.game_date}T${game.game_time || '12:00:00'}`)
    return gameDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex items-center py-2 px-3 bg-gray-700/50 rounded-lg gap-1">
      {/* Number - fixed width */}
      <div className="w-8 flex-shrink-0 text-center">
        <span className="text-gray-500 font-medium text-sm">{index}</span>
      </div>

      {/* Logo - fixed width */}
      <div className="w-10 flex-shrink-0 flex justify-center">
        {school.logo_url ? (
          <img src={school.logo_url} alt={school.name} className="w-9 h-9 object-contain" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: school.primary_color }}
          >
            {school.abbreviation || school.name.substring(0, 2)}
          </div>
        )}
      </div>

      {/* School Info - fixed width */}
      <div className="w-32 flex-shrink-0 overflow-hidden">
        <p className="text-white font-medium text-sm truncate">{school.name}</p>
        <p className="text-gray-400 text-xs truncate">{school.conference}</p>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

      {/* Double Points - fixed width */}
      {doublePointsEnabled && (
        <>
          <div className="w-10 flex-shrink-0 flex justify-center">
            {isDoublePointsPick ? (
              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">2x</span>
            ) : canPickDoublePoints ? (
              <button
                onClick={() => onDoublePointsSelect(schoolId)}
                className="text-purple-400 hover:text-purple-300 text-xs border border-purple-500 px-1.5 py-0.5 rounded hover:bg-purple-500/20 transition-colors"
              >
                2x
              </button>
            ) : (
              <span className="text-gray-600 text-xs">-</span>
            )}
          </div>
          <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />
        </>
      )}

      {/* Opponent - fixed width */}
      <div className="w-36 flex-shrink-0 flex items-center gap-1.5 overflow-hidden">
        {game ? (
          <>
            <span className="text-gray-400 text-xs flex-shrink-0">{isHome ? 'vs' : '@'}</span>
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
              {opponentLogo ? (
                <img src={opponentLogo} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-xs">
                  ?
                </div>
              )}
            </div>
            <span className="text-gray-300 text-xs truncate">
              {opponentRank && <span className="text-gray-500">#{opponentRank} </span>}
              {opponentName || 'TBD'}
            </span>
          </>
        ) : (
          <span className="text-gray-500 text-xs">Bye week</span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

      {/* Game Time/Status - fixed width */}
      <div className="w-28 flex-shrink-0 text-center overflow-hidden">
        {game ? (
          game.status === 'live' ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-white font-semibold text-sm">{myScore ?? 0}-{oppScore ?? 0}</span>
              <span className="text-yellow-400 text-xs animate-pulse">LIVE</span>
            </div>
          ) : game.status === 'completed' ? (
            <span className={`font-semibold text-sm ${(myScore || 0) > (oppScore || 0) ? 'text-green-400' : (myScore || 0) < (oppScore || 0) ? 'text-red-400' : 'text-gray-400'}`}>
              {myScore}-{oppScore} Final
            </span>
          ) : (
            <span className="text-gray-400 text-xs">{getGameTime()}</span>
          )
        ) : (
          <span className="text-gray-600 text-xs">-</span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

      {/* Points Summary - fixed width */}
      <div className="w-20 flex-shrink-0 text-right">
        <p className="text-white font-semibold text-sm">{totalPoints} pts</p>
        <p className="text-gray-400 text-xs">Wk{currentWeek}: {currentWeekPoints}</p>
      </div>

      {/* Expanded Points - horizontal inline */}
      {expanded && (
        <>
          <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />
          <div className="flex items-center gap-1 overflow-x-auto flex-nowrap">
            {/* Regular Season Weeks 0-16 */}
            {Array.from({ length: 17 }, (_, i) => i).map(week => {
              const pts = pointsByWeek.get(week) || 0
              const isCurrent = week === currentWeek
              return (
                <div
                  key={week}
                  className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs ${
                    isCurrent ? 'bg-blue-600/40 border border-blue-500' : 'bg-gray-700/50'
                  }`}
                >
                  <span className="text-gray-400">W{week}</span>
                  <span className={`ml-1 ${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>{pts}</span>
                </div>
              )
            })}

            {/* Heisman */}
            <div className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs bg-yellow-600/20">
              <span className="text-yellow-400">Heis</span>
              <span className="ml-1 text-gray-500">{pointsByWeek.get(99) || 0}</span>
            </div>

            {/* Playoff Rounds */}
            {[
              { week: 17, label: 'R1' },
              { week: 18, label: 'QF' },
              { week: 19, label: 'SF' },
              { week: 20, label: 'NC' }
            ].map(({ week, label }) => {
              const pts = pointsByWeek.get(week) || 0
              return (
                <div key={week} className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs bg-orange-600/20">
                  <span className="text-orange-400">{label}</span>
                  <span className={`ml-1 ${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>{pts}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
