'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface School {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  primary_color: string
}

interface RosterSchool {
  id: string
  school_id: string
  slot_number: number
  start_week: number
  schools: School
}

interface Game {
  id: string
  week_number: number
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
  game_date: string
  game_time: string | null
  is_conference_game?: boolean
  is_bowl_game?: boolean
  is_playoff_game?: boolean
}

interface SchoolPoints {
  school_id: string
  week_number: number
  total_points: number
}

interface OpponentSchool {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
}

interface DoublePick {
  week_number: number
  school_id: string
}

interface SpecialEventSettings {
  bowlAppearance: number
  playoffFirstRound: number
  playoffQuarterfinal: number
  playoffSemifinal: number
  championshipWin: number
  championshipLoss: number
  confChampWin: number
  confChampLoss: number
  heismanWinner: number
}

interface Props {
  roster: RosterSchool[]
  games: Game[]
  schoolPoints: SchoolPoints[]
  schoolRecordsMap: Record<string, { wins: number; losses: number }>
  currentWeek: number
  teamId: string
  seasonId: string
  doublePointsEnabled: boolean
  maxDoublePicksPerSeason: number
  opponentSchools: OpponentSchool[]
  doublePicks: DoublePick[]
  environment?: string
  simulatedDateISO?: string
  specialEventSettings?: SpecialEventSettings
}

export function RosterList({
  roster,
  games,
  schoolPoints,
  schoolRecordsMap,
  currentWeek,
  teamId,
  seasonId,
  doublePointsEnabled,
  maxDoublePicksPerSeason,
  opponentSchools,
  doublePicks,
  environment = 'production',
  simulatedDateISO,
  specialEventSettings
}: Props) {
  const supabase = createClient()
  const [doublePickSchoolId, setDoublePickSchoolId] = useState<string | null>(null)
  const [canPick, setCanPick] = useState(true)
  const [picksUsed, setPicksUsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [previewWeek, setPreviewWeek] = useState(currentWeek)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  useEffect(() => {
    if (doublePointsEnabled) {
      loadDoublePicks()
    }
  }, [teamId, currentWeek, doublePointsEnabled])

  const loadDoublePicks = async () => {
    const { data: allPicks } = await supabase
      .from('weekly_double_picks')
      .select('*')
      .eq('fantasy_team_id', teamId)

    if (allPicks) {
      setPicksUsed(allPicks.length)
      const thisWeekPick = allPicks.find(p => p.week_number === currentWeek)
      if (thisWeekPick) {
        setDoublePickSchoolId(thisWeekPick.school_id)
      }
    }

    // Check deadline - use simulated date if provided (for sandbox testing)
    const checkDate = simulatedDateISO ? new Date(simulatedDateISO) : new Date()
    const isSimulated = !!simulatedDateISO && (environment === 'sandbox' || environment === 'development')

    const schoolIds = roster.map(r => r.school_id)
    if (schoolIds.length > 0) {
      const weekGames = games.filter(g => g.week_number === currentWeek)
      const firstGame = weekGames.sort((a, b) => {
        const aTime = new Date(`${a.game_date}T${a.game_time || '12:00:00'}`)
        const bTime = new Date(`${b.game_date}T${b.game_time || '12:00:00'}`)
        return aTime.getTime() - bTime.getTime()
      })[0]

      if (firstGame) {
        const gameTime = new Date(`${firstGame.game_date}T${firstGame.game_time || '12:00:00'}`)
        // In sandbox with simulated date, only check date comparison (ignore actual game status)
        // In production, check both game status and current time
        if (isSimulated) {
          // Only use simulated date vs game time comparison
          if (checkDate >= gameTime) {
            setCanPick(false)
          }
        } else {
          // Production: check actual game status or current time
          if (firstGame.status === 'live' || firstGame.status === 'completed' || checkDate >= gameTime) {
            setCanPick(false)
          }
        }
      }
    }
  }

  const handleDoublePointsSelect = async (schoolId: string) => {
    if (!canPick || saving) return

    if (maxDoublePicksPerSeason > 0 && picksUsed >= maxDoublePicksPerSeason && !doublePickSchoolId) {
      return
    }

    setSaving(true)

    try {
      if (doublePickSchoolId) {
        await supabase
          .from('weekly_double_picks')
          .update({ school_id: schoolId, picked_at: new Date().toISOString() })
          .eq('fantasy_team_id', teamId)
          .eq('week_number', currentWeek)
      } else {
        await supabase
          .from('weekly_double_picks')
          .insert({
            fantasy_team_id: teamId,
            week_number: currentWeek,
            school_id: schoolId
          })
        setPicksUsed(prev => prev + 1)
      }

      setDoublePickSchoolId(schoolId)
    } catch (err) {
      console.error('Error saving double pick:', err)
    }

    setSaving(false)
  }

  const handleDoublePointsDeselect = async () => {
    if (!canPick || saving || !doublePickSchoolId) return

    setSaving(true)

    try {
      await supabase
        .from('weekly_double_picks')
        .delete()
        .eq('fantasy_team_id', teamId)
        .eq('week_number', currentWeek)

      setDoublePickSchoolId(null)
      setPicksUsed(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error removing double pick:', err)
    }

    setSaving(false)
  }

  // Build points by school
  const schoolPointsMap = new Map<string, Map<number, number>>()
  for (const sp of schoolPoints) {
    if (!schoolPointsMap.has(sp.school_id)) {
      schoolPointsMap.set(sp.school_id, new Map())
    }
    schoolPointsMap.get(sp.school_id)!.set(sp.week_number, sp.total_points)
  }

  // Calculate totals
  const schoolTotals = new Map<string, number>()
  for (const sp of schoolPoints) {
    const current = schoolTotals.get(sp.school_id) || 0
    schoolTotals.set(sp.school_id, current + Number(sp.total_points))
  }

  const maxPicksReached = maxDoublePicksPerSeason > 0 && picksUsed >= maxDoublePicksPerSeason && !doublePickSchoolId

  // Build opponent schools map for quick lookup
  const opponentSchoolsMap = new Map<string, OpponentSchool>()
  for (const school of opponentSchools) {
    opponentSchoolsMap.set(school.id, school)
  }

  // Build double picks map: school_id -> Set of week_numbers
  const doublePicksMap = new Map<string, Set<number>>()
  for (const pick of doublePicks) {
    if (!doublePicksMap.has(pick.school_id)) {
      doublePicksMap.set(pick.school_id, new Set())
    }
    doublePicksMap.get(pick.school_id)!.add(pick.week_number)
  }
  // Include current week's selection (from state) so it reflects immediately
  if (doublePickSchoolId) {
    if (!doublePicksMap.has(doublePickSchoolId)) {
      doublePicksMap.set(doublePickSchoolId, new Set())
    }
    doublePicksMap.get(doublePickSchoolId)!.add(currentWeek)
  }

  // Conference abbreviation mapping
  const conferenceAbbreviations: Record<string, string> = {
    'Big Ten': 'B10',
    'SEC': 'SEC',
    'Big 12': 'B12',
    'ACC': 'ACC',
    'Pac-12': 'P12',
    'American Athletic': 'AAC',
    'Mountain West': 'MW',
    'Sun Belt': 'SBC',
    'Conference USA': 'CUSA',
    'Mid-American': 'MAC',
    'Independent': 'IND',
  }

  // Week columns configuration
  const regularWeeks = Array.from({ length: 17 }, (_, i) => i) // 0-16
  const specialColumns = [
    { week: 17, label: 'Bowl', color: 'bg-green-600/20', textColor: 'text-green-400' },
    { week: 18, label: 'CFP', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
    { week: 19, label: 'NC', color: 'bg-yellow-600/20', textColor: 'text-yellow-400' },
    { week: 20, label: 'Heis', color: 'bg-purple-600/20', textColor: 'text-purple-400' },
  ]

  // Generate available weeks for preview (0-20 for full season including postseason)
  const availableWeeks = Array.from({ length: 21 }, (_, i) => i)

  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school)
    setShowScheduleModal(true)
  }

  // Get all games for selected school (for modal)
  const getSchoolGames = (schoolId: string) => {
    return games
      .filter(g => g.home_school_id === schoolId || g.away_school_id === schoolId)
      .sort((a, b) => a.week_number - b.week_number)
  }

  // Calculate per-game points for a school
  const calculateGamePoints = (game: Game, schoolId: string): number => {
    if (game.status !== 'completed' || game.home_score === null || game.away_score === null) {
      return 0
    }

    const isHome = game.home_school_id === schoolId
    const teamScore = isHome ? game.home_score : game.away_score
    const opponentScore = isHome ? game.away_score : game.home_score
    // Ranked bonus is for BEATING a ranked opponent
    const opponentRank = isHome ? game.away_rank : game.home_rank
    const isWin = teamScore > opponentScore
    const isPlayoff = game.is_playoff_game || false

    if (!isWin) return 0 // Only wins earn points

    let points = 1 // Base win points

    // Conference game bonus (not for bowl/playoff games)
    if (game.is_conference_game && !game.is_bowl_game && !isPlayoff) points += 1

    // 50+ points bonus
    if (teamScore >= 50) points += 1

    // Shutout bonus
    if (opponentScore === 0) points += 1

    // Ranked opponent bonus (for beating a ranked opponent)
    if (opponentRank) {
      const isBowl = game.is_bowl_game || false
      if (isBowl || isPlayoff) {
        // Bowls & Playoffs: only ranks 1-12 get the bonus (+2)
        if (opponentRank <= 12) points += 2
      } else {
        // Regular season: beating ranks 1-10 gets higher bonus, 11-25 gets lower bonus
        if (opponentRank <= 10) {
          points += 2
        } else if (opponentRank <= 25) {
          points += 1
        }
      }
    }

    return points
  }

  return (
    <div className="space-y-2">
      {/* Header with week preview and expand button */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span>Roster</span>
          {/* Week Preview Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 normal-case text-xs">Preview Week:</span>
            <select
              value={previewWeek}
              onChange={(e) => setPreviewWeek(parseInt(e.target.value))}
              className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {availableWeeks.map(week => (
                <option key={week} value={week}>
                  {week === currentWeek ? `Week ${week} (Current)` :
                   week === 17 ? 'Week 17 (Bowls)' :
                   week === 18 ? 'Week 18 (CFP)' :
                   week === 19 ? 'Week 19 (NC)' :
                   week === 20 ? 'Week 20 (Heisman)' :
                   `Week ${week}`}
                </option>
              ))}
            </select>
            {previewWeek !== currentWeek && (
              <button
                onClick={() => setPreviewWeek(currentWeek)}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs normal-case">{expanded ? 'Hide' : 'Show'} Weekly Points</span>
        </button>
      </div>

      {/* Roster container with fixed left + scrollable right */}
      <div className="flex">
        {/* Fixed left section */}
        <div className="flex-shrink-0">
          {/* Header row */}
          <div className="flex items-center h-8 px-3 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
            <span className="w-6 text-center">#</span>
            <span className="w-10"></span>
            <span className="w-32">School</span>
            <span className="w-px mx-1 h-5 bg-gray-700"></span>
            {doublePointsEnabled && (
              <>
                <span className="w-10 text-center">2x</span>
                <span className="w-px mx-1 h-5 bg-gray-700"></span>
              </>
            )}
            <span className="w-48">
              {previewWeek === currentWeek ? 'Opponent' : `Week ${previewWeek} Matchup`}
            </span>
            <span className="w-px mx-1 h-5 bg-gray-700"></span>
            <span className="w-20 text-center">Status</span>
            <span className="w-px mx-1 h-5 bg-gray-700"></span>
            <span className="w-16 text-right">Total</span>
          </div>

          {/* Data rows - fixed section */}
          {roster.map((slot, index) => {
            const school = slot.schools
            // Use previewWeek for opponent display (allows looking ahead/behind)
            const thisWeekGame = games.find(
              g => g.week_number === previewWeek &&
                   (g.home_school_id === slot.school_id || g.away_school_id === slot.school_id)
            )
            const total = schoolTotals.get(slot.school_id) || 0
            const isHome = thisWeekGame?.home_school_id === slot.school_id

            // Get opponent school from our schools data
            const opponentSchoolId = thisWeekGame ? (isHome ? thisWeekGame.away_school_id : thisWeekGame.home_school_id) : null
            const opponentSchool = opponentSchoolId ? opponentSchoolsMap.get(opponentSchoolId) : null
            const opponentName = opponentSchool?.name || 'TBD'
            const opponentLogo = opponentSchool?.logo_url || null
            const opponentConfAbbr = opponentSchool?.conference ? (conferenceAbbreviations[opponentSchool.conference] || opponentSchool.conference.substring(0, 3).toUpperCase()) : null
            const opponentRank = thisWeekGame ? (isHome ? thisWeekGame.away_rank : thisWeekGame.home_rank) : null
            const myScore = thisWeekGame ? (isHome ? thisWeekGame.home_score : thisWeekGame.away_score) : null
            const oppScore = thisWeekGame ? (isHome ? thisWeekGame.away_score : thisWeekGame.home_score) : null

            const getGameDateTime = () => {
              if (!thisWeekGame) return null
              const gameDate = new Date(`${thisWeekGame.game_date}T${thisWeekGame.game_time || '12:00:00'}`)
              const dateStr = gameDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
              const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              return `${dateStr} ${timeStr}`
            }

            return (
              <div key={slot.id} className="flex items-center h-14 px-3 bg-gray-700/50 border-b border-gray-800">
                {/* Number */}
                <div className="w-6 flex-shrink-0 text-center">
                  <span className="text-gray-500 font-medium text-sm">{index + 1}</span>
                </div>

                {/* School Logo */}
                <div className="w-10 flex-shrink-0 flex justify-center">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: school.primary_color }}
                    >
                      {school.abbreviation || school.name.substring(0, 2)}
                    </div>
                  )}
                </div>

                {/* School Name + Record - Clickable */}
                <div className="w-32 flex-shrink-0 overflow-hidden">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSchoolClick(school)}
                      className="text-white font-medium text-sm truncate hover:text-blue-400 transition-colors text-left"
                      title="Click to view schedule"
                    >
                      {school.name}
                    </button>
                    {schoolRecordsMap[slot.school_id] && (
                      <span className={`text-xs flex-shrink-0 ${
                        schoolRecordsMap[slot.school_id].wins > schoolRecordsMap[slot.school_id].losses
                          ? 'text-green-400'
                          : schoolRecordsMap[slot.school_id].wins < schoolRecordsMap[slot.school_id].losses
                            ? 'text-red-400'
                            : 'text-gray-400'
                      }`}>
                        ({schoolRecordsMap[slot.school_id].wins}-{schoolRecordsMap[slot.school_id].losses})
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs truncate">{school.conference}</p>
                </div>

                <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

                {/* Double Points */}
                {doublePointsEnabled && (
                  <>
                    <div className="w-10 flex-shrink-0 flex justify-center">
                      {doublePickSchoolId === slot.school_id ? (
                        // This school is selected - show clickable badge to deselect
                        <button
                          onClick={handleDoublePointsDeselect}
                          disabled={!canPick || saving}
                          className={`bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded ${
                            canPick && !saving ? 'hover:bg-purple-500 cursor-pointer' : 'opacity-75 cursor-not-allowed'
                          } transition-colors`}
                          title={canPick ? 'Click to remove 2x selection' : 'Cannot change after deadline'}
                        >
                          2x
                        </button>
                      ) : doublePickSchoolId ? (
                        // Another school is selected - hide button
                        <span className="text-gray-700 text-xs">-</span>
                      ) : canPick && !maxPicksReached && !saving ? (
                        // No selection yet - show selectable button
                        <button
                          onClick={() => handleDoublePointsSelect(slot.school_id)}
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

                {/* Opponent - wider section */}
                <div className="w-48 flex-shrink-0 flex items-center gap-2 overflow-hidden">
                  {thisWeekGame ? (
                    <>
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                        {opponentLogo ? (
                          <img src={opponentLogo} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-xs">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-gray-300 text-xs truncate">
                          <span className="text-gray-400">{isHome ? 'vs' : '@'} </span>
                          {opponentRank && opponentRank <= 25 && <span className="text-gray-500">#{opponentRank} </span>}
                          {opponentName}
                          {opponentConfAbbr && <span className="text-gray-500"> {opponentConfAbbr}</span>}
                        </span>
                        <span className="text-gray-500 text-xs">{getGameDateTime()}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-500 text-xs">Bye week</span>
                  )}
                </div>

                <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

                {/* Game Status - narrower */}
                <div className="w-20 flex-shrink-0 text-center overflow-hidden">
                  {thisWeekGame ? (
                    thisWeekGame.status === 'live' ? (
                      <div className="flex flex-col items-center">
                        <span className="text-white font-semibold text-sm">{myScore ?? 0}-{oppScore ?? 0}</span>
                        <span className="text-yellow-400 text-xs animate-pulse">LIVE</span>
                      </div>
                    ) : thisWeekGame.status === 'completed' ? (
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

                <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

                {/* Total Points */}
                <div className="w-16 flex-shrink-0 text-right">
                  <p className="text-white font-semibold text-sm">{total} pts</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable right section - Weekly Points */}
        {expanded && (
          <div className="flex-1 overflow-x-auto border-l border-gray-600">
            {/* Header row for weeks */}
            <div className="flex items-center h-8 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700 min-w-max">
              {regularWeeks.map(week => (
                <div
                  key={week}
                  className={`w-9 flex-shrink-0 text-center ${week === currentWeek ? 'text-blue-400' : ''}`}
                >
                  W{week}
                </div>
              ))}
              {specialColumns.map(({ week, label, textColor }) => (
                <div key={week} className={`w-11 flex-shrink-0 text-center ${textColor}`}>
                  {label}
                </div>
              ))}
            </div>

            {/* Data rows - weekly points */}
            {roster.map((slot) => {
              const pointsMap = schoolPointsMap.get(slot.school_id) || new Map()
              const startWeek = slot.start_week
              const schoolDoublePicks = doublePicksMap.get(slot.school_id)

              return (
                <div key={slot.id} className="flex items-center h-14 bg-gray-700/50 border-b border-gray-800 min-w-max">
                  {/* Regular season weeks */}
                  {regularWeeks.map(week => {
                    const pts = pointsMap.get(week) || 0
                    const isCurrent = week === currentWeek
                    const wasOnRoster = week >= startWeek
                    const hadDoublePick = schoolDoublePicks?.has(week)

                    return (
                      <div
                        key={week}
                        className={`w-9 flex-shrink-0 py-1 text-center relative ${
                          hadDoublePick ? 'bg-purple-600/30 border border-purple-500/50' :
                          isCurrent ? 'bg-blue-600/30' : ''
                        }`}
                      >
                        {wasOnRoster ? (
                          <div className="flex flex-col items-center">
                            {hadDoublePick && (
                              <span className="text-purple-400 text-[8px] font-bold leading-none">2x</span>
                            )}
                            <span className={`text-xs ${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                              {pts}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-700 text-xs">-</span>
                        )}
                      </div>
                    )
                  })}

                  {/* Special columns (Bowl, CFP, NC, Heisman) */}
                  {specialColumns.map(({ week, color }) => {
                    const pts = pointsMap.get(week) || 0
                    return (
                      <div key={week} className={`w-11 flex-shrink-0 py-1 text-center ${color}`}>
                        <span className={`text-xs ${pts > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                          {pts}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 border-t border-gray-700 mt-2">
        {doublePointsEnabled ? (
          <>
            <span>
              Double Points: {maxDoublePicksPerSeason > 0 ? `${picksUsed}/${maxDoublePicksPerSeason} used` : 'Unlimited'}
            </span>
            {!canPick && <span className="text-yellow-500">Deadline passed for this week</span>}
          </>
        ) : (
          <span>Double Points: Disabled</span>
        )}
      </div>

      {/* School Schedule Modal */}
      {showScheduleModal && selectedSchool && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                {selectedSchool.logo_url ? (
                  <img src={selectedSchool.logo_url} alt={selectedSchool.name} className="w-10 h-10 object-contain" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedSchool.primary_color }}
                  >
                    {selectedSchool.abbreviation || selectedSchool.name.substring(0, 2)}
                  </div>
                )}
                <div>
                  <h2 className="text-white font-bold text-lg">{selectedSchool.name}</h2>
                  <p className="text-gray-400 text-sm">
                    {selectedSchool.conference}
                    {schoolRecordsMap[selectedSchool.id] && (
                      <span className={`ml-2 ${
                        schoolRecordsMap[selectedSchool.id].wins > schoolRecordsMap[selectedSchool.id].losses
                          ? 'text-green-400'
                          : schoolRecordsMap[selectedSchool.id].wins < schoolRecordsMap[selectedSchool.id].losses
                            ? 'text-red-400'
                            : 'text-gray-400'
                      }`}>
                        ({schoolRecordsMap[selectedSchool.id].wins}-{schoolRecordsMap[selectedSchool.id].losses})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Schedule List */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Season Schedule</h3>
              <div className="space-y-2">
                {(() => {
                  const schoolGames = getSchoolGames(selectedSchool.id)
                  return schoolGames.map((game, index) => {
                    const isHome = game.home_school_id === selectedSchool.id
                    const opponentId = isHome ? game.away_school_id : game.home_school_id
                    const opponent = opponentId ? opponentSchoolsMap.get(opponentId) : null
                    const opponentName = opponent?.name || game[isHome ? 'away_team_name' : 'home_team_name'] || 'TBD'
                    const opponentLogo = opponent?.logo_url || game[isHome ? 'away_team_logo_url' : 'home_team_logo_url']
                    const opponentRank = isHome ? game.away_rank : game.home_rank
                    const myScore = isHome ? game.home_score : game.away_score
                    const oppScore = isHome ? game.away_score : game.home_score
                    const isCurrentWeek = game.week_number === currentWeek
                    const isPast = game.status === 'completed'
                    const isWin = isPast && myScore !== null && oppScore !== null && myScore > oppScore
                    const isLoss = isPast && myScore !== null && oppScore !== null && myScore < oppScore

                    // Calculate per-game points
                    const gamePoints = calculateGamePoints(game, selectedSchool.id)

                    // Calculate special event bonus (team-level bonuses for having this school)
                    let eventBonus = 0
                    let eventLabel = ''
                    if (specialEventSettings && game.status === 'completed') {
                      // Week 15: Conference Championship
                      if (game.week_number === 15) {
                        if (isWin) {
                          eventBonus = specialEventSettings.confChampWin
                          eventLabel = 'Conf Champ Win'
                        } else if (isLoss) {
                          eventBonus = specialEventSettings.confChampLoss
                          eventLabel = 'Conf Champ Loss'
                        }
                      }
                      // Week 17: Bowl Appearance
                      else if (game.week_number === 17 && game.is_bowl_game) {
                        eventBonus = specialEventSettings.bowlAppearance
                        eventLabel = 'Bowl'
                      }
                      // Week 18: CFP First Round / Quarterfinal
                      else if (game.week_number === 18 && game.is_playoff_game) {
                        // First round is the first CFP game, quarterfinal is typically higher seeds
                        // For simplicity, show quarterfinal bonus (they stack in calculate-special-events)
                        eventBonus = specialEventSettings.playoffQuarterfinal
                        eventLabel = 'CFP QF'
                      }
                      // Week 19: Semifinal / Championship
                      else if (game.week_number === 19 && game.is_playoff_game) {
                        // Check if this is likely the championship (final game of week 19)
                        const week19Games = games.filter(g => g.week_number === 19 && g.is_playoff_game)
                        const isChampionship = week19Games.length === 1 ||
                          (game.game_date === week19Games.sort((a, b) => b.game_date.localeCompare(a.game_date))[0]?.game_date)

                        if (isChampionship) {
                          if (isWin) {
                            eventBonus = specialEventSettings.championshipWin
                            eventLabel = 'Natl Champ'
                          } else {
                            eventBonus = specialEventSettings.championshipLoss
                            eventLabel = 'Runner-up'
                          }
                        } else {
                          eventBonus = specialEventSettings.playoffSemifinal
                          eventLabel = 'CFP Semi'
                        }
                      }
                    }

                    // Week label
                    const weekLabel = game.week_number <= 14 ? `Week ${game.week_number}` :
                      game.week_number === 15 ? 'Conf Champ' :
                      game.week_number === 16 ? 'Week 16' :
                      game.week_number === 17 ? 'Bowl' :
                      game.week_number === 18 ? 'CFP' :
                      game.week_number === 19 ? 'Championship' : `Week ${game.week_number}`

                    return (
                      <div
                        key={game.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isCurrentWeek ? 'bg-blue-600/20 border border-blue-500/50' :
                          isPast ? 'bg-gray-700/30' : 'bg-gray-700/50'
                        }`}
                      >
                        {/* Week */}
                        <div className="w-20 flex-shrink-0">
                          <span className={`text-xs font-medium ${isCurrentWeek ? 'text-blue-400' : 'text-gray-400'}`}>
                            {weekLabel}
                          </span>
                        </div>

                        {/* Opponent */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-gray-400 text-xs w-6">{isHome ? 'vs' : '@'}</span>
                          {opponentLogo ? (
                            <img src={opponentLogo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex-shrink-0" />
                          )}
                          <span className="text-white text-sm truncate">
                            {opponentRank && opponentRank <= 25 && <span className="text-gray-500">#{opponentRank} </span>}
                            {opponentName}
                          </span>
                        </div>

                        {/* Result/Status + Points */}
                        <div className="w-36 text-right flex-shrink-0">
                          {game.status === 'completed' ? (
                            <div className="flex flex-col items-end">
                              <span className={`text-sm font-semibold ${
                                isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {isWin ? 'W' : isLoss ? 'L' : 'T'} {myScore}-{oppScore}
                              </span>
                              <div className="flex items-center gap-2">
                                {gamePoints > 0 && <span className="text-xs text-blue-400">+{gamePoints} pts</span>}
                                {eventBonus > 0 && (
                                  <span className="text-xs text-purple-400" title={eventLabel}>
                                    +{eventBonus} {eventLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : game.status === 'live' ? (
                            <span className="text-yellow-400 text-sm animate-pulse">LIVE</span>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              {new Date(`${game.game_date}T${game.game_time || '12:00:00'}`).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}

                {getSchoolGames(selectedSchool.id).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No games scheduled</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
