'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  teamId: string
  doublePointsEnabled: boolean
  isDoublePointsPick: boolean
  canPickDoublePoints: boolean
  onDoublePointsSelect: (schoolId: string) => void
}

export function RosterRow({
  index,
  schoolId,
  school,
  game,
  weeklyPoints,
  totalPoints,
  currentWeek,
  teamId,
  doublePointsEnabled,
  isDoublePointsPick,
  canPickDoublePoints,
  onDoublePointsSelect
}: Props) {
  const [expanded, setExpanded] = useState(false)

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

  return (
    <div className="bg-gray-700/50 rounded-lg overflow-hidden">
      {/* Main Row */}
      <div className="flex items-center p-3 gap-2">
        {/* Number */}
        <span className="w-6 text-center text-gray-500 font-medium text-sm">{index}</span>

        {/* Logo */}
        {school.logo_url ? (
          <img src={school.logo_url} alt={school.name} className="w-10 h-10 object-contain" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: school.primary_color }}
          >
            {school.abbreviation || school.name.substring(0, 2)}
          </div>
        )}

        {/* School Info */}
        <div className="min-w-[140px]">
          <p className="text-white font-medium text-sm">{school.name}</p>
          <p className="text-gray-400 text-xs">{school.conference}</p>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600 mx-2" />

        {/* Double Points */}
        {doublePointsEnabled && (
          <>
            <div className="w-12 flex justify-center">
              {isDoublePointsPick ? (
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">2x</span>
              ) : canPickDoublePoints ? (
                <button
                  onClick={() => onDoublePointsSelect(schoolId)}
                  className="text-purple-400 hover:text-purple-300 text-xs border border-purple-500 px-2 py-1 rounded hover:bg-purple-500/20 transition-colors"
                >
                  2x
                </button>
              ) : (
                <span className="text-gray-600 text-xs">-</span>
              )}
            </div>
            <div className="w-px h-8 bg-gray-600 mx-2" />
          </>
        )}

        {/* Opponent */}
        <div className="min-w-[120px] flex items-center gap-2">
          {game ? (
            <>
              <span className="text-gray-400 text-xs">{isHome ? 'vs' : '@'}</span>
              {opponentLogo ? (
                <img src={opponentLogo} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <div className="w-6 h-6 bg-gray-600 rounded-full" />
              )}
              <span className="text-gray-300 text-sm truncate">
                {opponentRank && <span className="text-gray-500 text-xs">#{opponentRank} </span>}
                {opponentName}
              </span>
            </>
          ) : (
            <span className="text-gray-500 text-xs">No game</span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600 mx-2" />

        {/* Score */}
        <div className="w-20 text-center">
          {game ? (
            game.status === 'completed' ? (
              <span className={`font-semibold text-sm ${(myScore || 0) > (oppScore || 0) ? 'text-green-400' : 'text-red-400'}`}>
                {myScore}-{oppScore}
              </span>
            ) : game.status === 'live' ? (
              <div>
                <span className="text-white font-semibold text-sm">{myScore}-{oppScore}</span>
                <span className="text-yellow-400 text-xs ml-1 animate-pulse">LIVE</span>
              </div>
            ) : (
              <span className="text-gray-500 text-xs">0-0</span>
            )
          ) : (
            <span className="text-gray-600 text-xs">-</span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-600 mx-2" />

        {/* Points Summary + Expand Button */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-right min-w-[80px]">
            <p className="text-white font-semibold text-sm">{totalPoints} pts</p>
            <p className="text-gray-400 text-xs">Wk {currentWeek}: {currentWeekPoints}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Weekly Points */}
      {expanded && (
        <div className="bg-gray-800/50 px-4 py-3 border-t border-gray-600">
          <div className="flex flex-wrap gap-2">
            {/* Total */}
            <div className="bg-gray-700 rounded px-3 py-1">
              <span className="text-gray-400 text-xs">Total</span>
              <span className="text-white font-semibold text-sm ml-2">{totalPoints}</span>
            </div>

            {/* Regular Season Weeks */}
            {Array.from({ length: 15 }, (_, i) => i).map(week => {
              const pts = pointsByWeek.get(week) || 0
              const isCurrent = week === currentWeek
              return (
                <div
                  key={week}
                  className={`rounded px-2 py-1 ${isCurrent ? 'bg-blue-600/30 border border-blue-500' : 'bg-gray-700/50'}`}
                >
                  <span className="text-gray-400 text-xs">W{week}</span>
                  <span className={`text-sm ml-1 ${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                    {pts}
                  </span>
                </div>
              )
            })}

            {/* Bowl Week */}
            <div className="bg-gray-700/50 rounded px-2 py-1">
              <span className="text-yellow-400 text-xs">Bowl</span>
              <span className="text-sm ml-1 text-gray-400">{pointsByWeek.get(16) || 0}</span>
            </div>

            {/* Playoff Weeks */}
            {[17, 18, 19, 20].map(week => {
              const pts = pointsByWeek.get(week) || 0
              const labels: Record<number, string> = { 17: 'R1', 18: 'QF', 19: 'SF', 20: 'NC' }
              return (
                <div key={week} className="bg-gray-700/50 rounded px-2 py-1">
                  <span className="text-orange-400 text-xs">{labels[week]}</span>
                  <span className={`text-sm ml-1 ${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                    {pts}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
