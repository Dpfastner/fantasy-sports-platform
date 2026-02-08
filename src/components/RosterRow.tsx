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
  startWeek: number
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
  startWeek,
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

  // Format game date/time for two-line display
  const getGameDateTime = () => {
    if (!game) return null
    const gameDate = new Date(`${game.game_date}T${game.game_time || '12:00:00'}`)
    const dateStr = gameDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    })
    const timeStr = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
    return `${dateStr} ${timeStr}`
  }

  // Get game status display
  const getGameStatus = () => {
    if (!game) return null
    if (game.status === 'completed') return 'Final'
    if (game.status === 'live') return `Q${game.quarter} ${game.clock}`
    return null
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

      {/* Opponent - fixed width, two-line display */}
      <div className="w-40 flex-shrink-0 flex items-center gap-1.5 overflow-hidden">
        {game ? (
          <>
            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
              {opponentLogo ? (
                <img src={opponentLogo} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-xs">
                  ?
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-gray-300 text-xs truncate">
                <span className="text-gray-400">{isHome ? 'vs' : '@'} </span>
                {opponentRank && <span className="text-gray-500">#{opponentRank} </span>}
                {opponentName || 'TBD'}
              </span>
              <span className="text-gray-500 text-xs">{getGameDateTime()}</span>
            </div>
          </>
        ) : (
          <span className="text-gray-500 text-xs">Bye week</span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

      {/* Game Status - fixed width */}
      <div className="w-24 flex-shrink-0 text-center overflow-hidden">
        {game ? (
          game.status === 'live' ? (
            <div className="flex flex-col items-center">
              <span className="text-white font-semibold text-sm">{myScore ?? 0}-{oppScore ?? 0}</span>
              <span className="text-yellow-400 text-xs animate-pulse">LIVE</span>
            </div>
          ) : game.status === 'completed' ? (
            <div className="flex flex-col items-center">
              <span className={`font-semibold text-sm ${(myScore || 0) > (oppScore || 0) ? 'text-green-400' : (myScore || 0) < (oppScore || 0) ? 'text-red-400' : 'text-gray-400'}`}>
                {myScore}-{oppScore}
              </span>
              <span className="text-gray-500 text-xs">Final</span>
            </div>
          ) : (
            <span className="text-gray-500 text-xs">Upcoming</span>
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

      {/* Expanded Points - vertical layout, only weeks from startWeek */}
      {expanded && (
        <>
          <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />
          <div className="flex items-center gap-0.5 flex-nowrap">
            {/* Regular Season Weeks - only show from startWeek */}
            {Array.from({ length: 17 }, (_, i) => i)
              .filter(week => week >= startWeek)
              .map(week => {
                const pts = pointsByWeek.get(week) || 0
                const isCurrent = week === currentWeek
                return (
                  <div
                    key={week}
                    className={`flex-shrink-0 w-8 py-1 rounded text-xs text-center ${
                      isCurrent ? 'bg-blue-600/40 border border-blue-500' : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="text-gray-400 text-[10px]">W{week}</div>
                    <div className={`${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>{pts}</div>
                  </div>
                )
              })}

            {/* Heisman */}
            <div className="flex-shrink-0 w-9 py-1 rounded text-xs text-center bg-yellow-600/20">
              <div className="text-yellow-400 text-[10px]">Heis</div>
              <div className="text-gray-500">{pointsByWeek.get(99) || 0}</div>
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
                <div key={week} className="flex-shrink-0 w-8 py-1 rounded text-xs text-center bg-orange-600/20">
                  <div className="text-orange-400 text-[10px]">{label}</div>
                  <div className={`${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>{pts}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
