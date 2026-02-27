'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { trackActivity } from '@/app/actions/activity'
import {
  REGULAR_WEEK_COUNT,
  ROSTER_SPECIAL_COLUMNS,
  WEEK_CONF_CHAMPS,
  WEEK_BOWLS,
  WEEK_ARMY_NAVY,
  REGULAR_SEASON_END,
  EVENT_BONUS_WEEKS,
  SCHEDULE_WEEK_LABELS,
} from '@/lib/constants/season'

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
  playoff_round?: string | null // 'first_round', 'quarterfinal', 'semifinal', 'championship'
}

interface SchoolPoints {
  school_id: string
  week_number: number
  total_points: number
  game_id: string | null
  base_points: number
  conference_bonus: number
  over_50_bonus: number
  shutout_bonus: number
  ranked_25_bonus: number
  ranked_10_bonus: number
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

interface EventBonus {
  school_id: string
  week_number: number
  bonus_type: string
  points: number
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
  eventBonuses?: EventBonus[]
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
  specialEventSettings,
  eventBonuses = []
}: Props) {
  const supabase = createClient()
  const { addToast } = useToast()
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

      trackActivity('double_points.pick_made', null, { teamId, schoolId, week: currentWeek })
      setDoublePickSchoolId(schoolId)
    } catch (err) {
      console.error('Error saving double pick:', err)
      addToast('Failed to save double pick. Please try again.', 'error')
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

      trackActivity('double_points.pick_removed', null, { teamId, week: currentWeek })
      setDoublePickSchoolId(null)
      setPicksUsed(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error removing double pick:', err)
      addToast('Failed to remove double pick. Please try again.', 'error')
    }

    setSaving(false)
  }

  // Build points by school
  const schoolPointsMap = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    for (const sp of schoolPoints) {
      if (!map.has(sp.school_id)) {
        map.set(sp.school_id, new Map())
      }
      map.get(sp.school_id)!.set(sp.week_number, sp.total_points)
    }
    return map
  }, [schoolPoints])

  // Calculate totals
  const schoolTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const sp of schoolPoints) {
      const current = totals.get(sp.school_id) || 0
      totals.set(sp.school_id, current + Number(sp.total_points))
    }
    return totals
  }, [schoolPoints])

  const maxPicksReached = maxDoublePicksPerSeason > 0 && picksUsed >= maxDoublePicksPerSeason && !doublePickSchoolId

  // Build opponent schools map for quick lookup
  const opponentSchoolsMap = useMemo(() => {
    const map = new Map<string, OpponentSchool>()
    for (const school of opponentSchools) {
      map.set(school.id, school)
    }
    return map
  }, [opponentSchools])

  // Build double picks map: school_id -> Set of week_numbers
  const doublePicksMap = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const pick of doublePicks) {
      if (!map.has(pick.school_id)) {
        map.set(pick.school_id, new Set())
      }
      map.get(pick.school_id)!.add(pick.week_number)
    }
    // Include current week's selection (from state) so it reflects immediately
    if (doublePickSchoolId) {
      if (!map.has(doublePickSchoolId)) {
        map.set(doublePickSchoolId, new Set())
      }
      map.get(doublePickSchoolId)!.add(currentWeek)
    }
    return map
  }, [doublePicks, doublePickSchoolId, currentWeek])

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
  const regularWeeks = Array.from({ length: REGULAR_WEEK_COUNT }, (_, i) => i) // 0-16
  const specialColumns = ROSTER_SPECIAL_COLUMNS

  // Generate available weeks for preview (0-22 for full season including Heisman)
  const availableWeeks = Array.from({ length: 23 }, (_, i) => i)

  // Build event bonuses map: school_id -> week_number -> total bonus
  const eventBonusMap = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    for (const eb of eventBonuses) {
      if (!map.has(eb.school_id)) {
        map.set(eb.school_id, new Map())
      }
      const weekMap = map.get(eb.school_id)!
      weekMap.set(eb.week_number, (weekMap.get(eb.week_number) || 0) + eb.points)
    }
    return map
  }, [eventBonuses])

  // Get event bonus for a school in a given week (from database)
  const getEventBonus = useCallback((schoolId: string, weekNumber: number): number => {
    return eventBonusMap.get(schoolId)?.get(weekNumber) || 0
  }, [eventBonusMap])

  // Get detailed event bonuses for modal display (fallback to calculation if not in DB)
  const getEventBonusDetails = (schoolId: string, weekNumber: number, game: Game): { label: string; points: number }[] => {
    // Map bonus_type to friendly labels
    const labelMap: Record<string, string> = {
      'conf_championship_win': 'Conf Champ',
      'conf_championship_loss': 'Conf Champ',
      'bowl_appearance': 'Bowl',
      'cfp_first_round': 'CFP R1',
      'cfp_quarterfinal': 'CFP QF',
      'cfp_semifinal': 'CFP Semi',
      'championship_win': 'Natl Champ',
      'championship_loss': 'Runner-up',
      'heisman': 'Heisman'
    }

    // Get bonuses from database for this school/week
    let dbBonuses = eventBonuses.filter(eb => eb.school_id === schoolId && eb.week_number === weekNumber)

    // For CFP Quarterfinal (week 19), also include CFP R1 bonus (week 18) for bye teams
    // Bye teams don't have a week 18 game, so their R1 bonus needs to show on QF row
    if (game.playoff_round === 'quarterfinal') {
      const hasWeek18Game = games.some(g =>
        g.week_number === 18 &&
        (g.home_school_id === schoolId || g.away_school_id === schoolId)
      )
      if (!hasWeek18Game) {
        const r1Bonuses = eventBonuses.filter(eb => eb.school_id === schoolId && eb.week_number === 18)
        dbBonuses = [...r1Bonuses, ...dbBonuses]
      }
    }

    if (dbBonuses.length > 0) {
      return dbBonuses.map(eb => ({
        label: labelMap[eb.bonus_type] || eb.bonus_type,
        points: eb.points
      }))
    }

    // Fallback to calculation for backwards compatibility (if DB not populated)
    if (!specialEventSettings || game.status !== 'completed') return []

    const isHome = game.home_school_id === schoolId
    const myScore = isHome ? game.home_score : game.away_score
    const oppScore = isHome ? game.away_score : game.home_score
    const myRank = isHome ? game.home_rank : game.away_rank
    const isWin = myScore !== null && oppScore !== null && myScore > oppScore
    const isLoss = myScore !== null && oppScore !== null && myScore < oppScore
    const result: { label: string; points: number }[] = []

    if (weekNumber === WEEK_CONF_CHAMPS) {
      if (isWin && specialEventSettings.confChampWin > 0) {
        result.push({ label: 'Conf Champ', points: specialEventSettings.confChampWin })
      } else if (isLoss && specialEventSettings.confChampLoss > 0) {
        result.push({ label: 'Conf Champ', points: specialEventSettings.confChampLoss })
      }
    } else if (weekNumber === WEEK_BOWLS && game.is_bowl_game && specialEventSettings.bowlAppearance > 0) {
      result.push({ label: 'Bowl', points: specialEventSettings.bowlAppearance })
    } else if (game.is_playoff_game && game.playoff_round) {
      if (game.playoff_round === 'first_round' && specialEventSettings.playoffFirstRound > 0) {
        result.push({ label: 'CFP R1', points: specialEventSettings.playoffFirstRound })
      } else if (game.playoff_round === 'quarterfinal') {
        const isByeTeam = myRank && myRank <= 4
        if (isByeTeam && specialEventSettings.playoffFirstRound > 0) {
          result.push({ label: 'CFP R1', points: specialEventSettings.playoffFirstRound })
        }
        if (specialEventSettings.playoffQuarterfinal > 0) {
          result.push({ label: 'CFP QF', points: specialEventSettings.playoffQuarterfinal })
        }
      } else if (game.playoff_round === 'semifinal' && specialEventSettings.playoffSemifinal > 0) {
        result.push({ label: 'CFP Semi', points: specialEventSettings.playoffSemifinal })
      } else if (game.playoff_round === 'championship') {
        if (isWin && specialEventSettings.championshipWin > 0) {
          result.push({ label: 'Natl Champ', points: specialEventSettings.championshipWin })
        } else if (isLoss && specialEventSettings.championshipLoss > 0) {
          result.push({ label: 'Runner-up', points: specialEventSettings.championshipLoss })
        }
      }
    }
    return result
  }

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

  return (
    <div className="space-y-2">
      {/* Header with week preview and expand button */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-text-muted uppercase tracking-wide border-b border-border">
        <div className="flex items-center gap-3">
          <span>Roster</span>
          {/* Week Preview Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-text-secondary normal-case text-xs">Preview Week:</span>
            <select
              value={previewWeek}
              onChange={(e) => setPreviewWeek(parseInt(e.target.value))}
              className="bg-surface text-text-primary text-xs rounded px-2 py-1 border border-border focus:border-brand focus:outline-none"
            >
              {availableWeeks.map(week => (
                <option key={week} value={week}>
                  {week === currentWeek ? `Week ${week} (Current)` :
                   week === 17 ? 'Week 17 (Bowls)' :
                   week === 18 ? 'Week 18 (CFP R1)' :
                   week === 19 ? 'Week 19 (CFP QF)' :
                   week === 20 ? 'Week 20 (CFP SF)' :
                   week === 21 ? 'Week 21 (NC)' :
                   week === 22 ? 'Week 22 (Heisman)' :
                   `Week ${week}`}
                </option>
              ))}
            </select>
            {previewWeek !== currentWeek && (
              <button
                onClick={() => setPreviewWeek(currentWeek)}
                className="text-brand-text hover:text-brand-text text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2 py-1 bg-surface hover:bg-surface-subtle rounded text-text-secondary transition-colors"
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
          <div className="flex items-center h-8 px-3 text-xs text-text-muted uppercase tracking-wide border-b border-border">
            <span className="w-6 text-center">#</span>
            <span className="w-10"></span>
            <span className="w-32">School</span>
            <span className="w-px mx-1 h-5 bg-surface"></span>
            {doublePointsEnabled && (
              <>
                <span className="w-10 text-center">2x</span>
                <span className="w-px mx-1 h-5 bg-surface"></span>
              </>
            )}
            <span className="w-48">
              {previewWeek === currentWeek ? 'Opponent' : `Week ${previewWeek} Matchup`}
            </span>
            <span className="w-px mx-1 h-5 bg-surface"></span>
            <span className="w-20 text-center">Status</span>
            <span className="w-px mx-1 h-5 bg-surface"></span>
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
            // Calculate total including event bonuses for special weeks
            const gamePointsTotal = schoolTotals.get(slot.school_id) || 0
            const eventBonusTotal = EVENT_BONUS_WEEKS.reduce(
              (sum, week) => sum + getEventBonus(slot.school_id, week), 0
            )
            const total = gamePointsTotal + eventBonusTotal
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
              <div key={slot.id} className="flex items-center h-14 px-3 bg-surface-inset border-b border-surface">
                {/* Number */}
                <div className="w-6 flex-shrink-0 text-center">
                  <span className="text-text-muted font-medium text-sm">{index + 1}</span>
                </div>

                {/* School Logo */}
                <div className="w-10 flex-shrink-0 flex justify-center">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-primary font-bold text-xs"
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
                      className="text-text-primary font-medium text-sm truncate hover:text-brand-text transition-colors text-left"
                      title="Click to view schedule"
                    >
                      {school.name}
                    </button>
                    {schoolRecordsMap[slot.school_id] && (
                      <span className={`text-xs flex-shrink-0 ${
                        schoolRecordsMap[slot.school_id].wins > schoolRecordsMap[slot.school_id].losses
                          ? 'text-success-text'
                          : schoolRecordsMap[slot.school_id].wins < schoolRecordsMap[slot.school_id].losses
                            ? 'text-danger-text'
                            : 'text-text-secondary'
                      }`}>
                        ({schoolRecordsMap[slot.school_id].wins}-{schoolRecordsMap[slot.school_id].losses})
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-xs truncate">{school.conference}</p>
                </div>

                <div className="w-px h-10 bg-surface-subtle flex-shrink-0 mx-1" />

                {/* Double Points */}
                {doublePointsEnabled && (
                  <>
                    <div className="w-10 flex-shrink-0 flex justify-center">
                      {doublePickSchoolId === slot.school_id ? (
                        // This school is selected - show clickable badge to deselect
                        <button
                          onClick={handleDoublePointsDeselect}
                          disabled={!canPick || saving}
                          className={`bg-info text-text-primary text-xs font-bold px-2 py-1 rounded ${
                            canPick && !saving ? 'hover:bg-info cursor-pointer' : 'opacity-75 cursor-not-allowed'
                          } transition-colors`}
                          title={canPick ? 'Click to remove 2x selection' : 'Cannot change after deadline'}
                        >
                          2x
                        </button>
                      ) : doublePickSchoolId ? (
                        // Another school is selected - hide button
                        <span className="text-text-muted text-xs">-</span>
                      ) : canPick && !maxPicksReached && !saving ? (
                        // No selection yet - show selectable button
                        <button
                          onClick={() => handleDoublePointsSelect(slot.school_id)}
                          className="text-info-text hover:text-info-text text-xs border border-info px-1.5 py-0.5 rounded hover:bg-info-subtle transition-colors"
                        >
                          2x
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">-</span>
                      )}
                    </div>
                    <div className="w-px h-10 bg-surface-subtle flex-shrink-0 mx-1" />
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
                          <div className="w-8 h-8 bg-surface-subtle rounded-full flex items-center justify-center text-text-secondary text-xs">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-text-secondary text-xs truncate">
                          <span className="text-text-secondary">{isHome ? 'vs' : '@'} </span>
                          {opponentRank && opponentRank <= 25 && <span className="text-text-muted">#{opponentRank} </span>}
                          {opponentName}
                          {opponentConfAbbr && <span className="text-text-muted"> {opponentConfAbbr}</span>}
                        </span>
                        <span className="text-text-muted text-xs">{getGameDateTime()}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-text-muted text-xs">Bye week</span>
                  )}
                </div>

                <div className="w-px h-10 bg-surface-subtle flex-shrink-0 mx-1" />

                {/* Game Status - narrower */}
                <div className="w-20 flex-shrink-0 text-center overflow-hidden">
                  {thisWeekGame ? (
                    thisWeekGame.status === 'live' ? (
                      <div className="flex flex-col items-center">
                        <span className="text-text-primary font-semibold text-sm">{myScore ?? 0}-{oppScore ?? 0}</span>
                        <span className="text-warning-text text-xs animate-pulse">LIVE</span>
                      </div>
                    ) : thisWeekGame.status === 'completed' ? (
                      <div className="flex flex-col items-center">
                        <span className={`font-semibold text-sm ${(myScore || 0) > (oppScore || 0) ? 'text-success-text' : (myScore || 0) < (oppScore || 0) ? 'text-danger-text' : 'text-text-secondary'}`}>
                          {myScore}-{oppScore}
                        </span>
                        <span className="text-text-muted text-xs">Final</span>
                      </div>
                    ) : (
                      <span className="text-text-muted text-xs">Upcoming</span>
                    )
                  ) : (
                    <span className="text-text-muted text-xs">-</span>
                  )}
                </div>

                <div className="w-px h-10 bg-surface-subtle flex-shrink-0 mx-1" />

                {/* Total Points */}
                <div className="w-16 flex-shrink-0 text-right">
                  <p className="text-text-primary font-semibold text-sm">{total} pts</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable right section - Weekly Points */}
        {expanded && (
          <div className="flex-1 overflow-x-auto border-l border-border">
            {/* Header row for weeks */}
            <div className="flex items-center h-8 text-xs text-text-muted uppercase tracking-wide border-b border-border min-w-max">
              {regularWeeks.map(week => (
                <div
                  key={week}
                  className={`w-9 flex-shrink-0 text-center ${week === currentWeek ? 'text-brand-text' : ''}`}
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
                <div key={slot.id} className="flex items-center h-14 bg-surface-inset border-b border-surface min-w-max">
                  {/* Regular season weeks - includes event bonuses for week 15 (conf championship) */}
                  {regularWeeks.map(week => {
                    const gamePts = pointsMap.get(week) || 0
                    const eventBonus = week === 15 ? getEventBonus(slot.school_id, week) : 0
                    const pts = gamePts + eventBonus
                    const isCurrent = week === currentWeek
                    const wasOnRoster = week >= startWeek
                    const hadDoublePick = schoolDoublePicks?.has(week)

                    return (
                      <div
                        key={week}
                        className={`w-9 flex-shrink-0 py-1 text-center relative ${
                          hadDoublePick ? 'bg-info-subtle border border-info/50' :
                          isCurrent ? 'bg-brand-subtle' : ''
                        }`}
                      >
                        {wasOnRoster ? (
                          <div className="flex flex-col items-center">
                            {hadDoublePick && (
                              <span className="text-info-text text-[8px] font-bold leading-none">2x</span>
                            )}
                            <span className={`text-xs ${pts > 0 ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                              {pts}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">-</span>
                        )}
                      </div>
                    )
                  })}

                  {/* Special columns (Bowl, CFP R1, QF, SF, NC) - includes event bonuses */}
                  {specialColumns.map(({ week, color }) => {
                    const gamePts = pointsMap.get(week) || 0
                    const eventBonus = getEventBonus(slot.school_id, week)
                    const totalPts = gamePts + eventBonus
                    return (
                      <div key={week} className={`w-11 flex-shrink-0 py-1 text-center ${color}`}>
                        <span className={`text-xs ${totalPts > 0 ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                          {totalPts}
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
      <div className="flex items-center justify-between px-3 py-2 text-xs text-text-muted border-t border-border mt-2">
        {doublePointsEnabled ? (
          <>
            <span>
              Double Points: {maxDoublePicksPerSeason > 0 ? `${picksUsed}/${maxDoublePicksPerSeason} used` : 'Unlimited'}
            </span>
            {!canPick && <span className="text-warning-text">Deadline passed for this week</span>}
          </>
        ) : (
          <span>Double Points: Disabled</span>
        )}
      </div>

      {/* School Schedule Modal */}
      {showScheduleModal && selectedSchool && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                {selectedSchool.logo_url ? (
                  <img src={selectedSchool.logo_url} alt={selectedSchool.name} className="w-10 h-10 object-contain" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-text-primary font-bold"
                    style={{ backgroundColor: selectedSchool.primary_color }}
                  >
                    {selectedSchool.abbreviation || selectedSchool.name.substring(0, 2)}
                  </div>
                )}
                <div>
                  <h2 className="text-text-primary font-bold text-lg">{selectedSchool.name}</h2>
                  <p className="text-text-secondary text-sm">
                    {selectedSchool.conference}
                    {schoolRecordsMap[selectedSchool.id] && (
                      <span className={`ml-2 ${
                        schoolRecordsMap[selectedSchool.id].wins > schoolRecordsMap[selectedSchool.id].losses
                          ? 'text-success-text'
                          : schoolRecordsMap[selectedSchool.id].wins < schoolRecordsMap[selectedSchool.id].losses
                            ? 'text-danger-text'
                            : 'text-text-secondary'
                      }`}>
                        ({schoolRecordsMap[selectedSchool.id].wins}-{schoolRecordsMap[selectedSchool.id].losses})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-surface transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Schedule List */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              <h3 className="text-text-secondary text-xs uppercase tracking-wide mb-3">Season Schedule</h3>
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
                    const myRank = isHome ? game.home_rank : game.away_rank
                    const myScore = isHome ? game.home_score : game.away_score
                    const oppScore = isHome ? game.away_score : game.home_score
                    const isCurrentWeek = game.week_number === currentWeek
                    const isPast = game.status === 'completed'
                    const isWin = isPast && myScore !== null && oppScore !== null && myScore > oppScore
                    const isLoss = isPast && myScore !== null && oppScore !== null && myScore < oppScore

                    // Get points from database (authoritative source)
                    const dbPoints = schoolPoints.find(sp => sp.game_id === game.id && sp.school_id === selectedSchool.id)
                    const gamePoints = dbPoints?.total_points || 0

                    // Get event bonuses from database (or fallback calculation)
                    const eventBonusList = getEventBonusDetails(selectedSchool.id, game.week_number, game)

                    // Week label - use playoff_round for accurate CFP labels
                    // Database values: 'first_round', 'quarterfinal', 'semifinal', 'championship'
                    let weekLabel = ''
                    if (game.is_playoff_game && game.playoff_round) {
                      const roundLabels: Record<string, string> = {
                        'first_round': 'CFP R1',
                        'quarterfinal': 'CFP QF',
                        'semifinal': 'CFP Semi',
                        'championship': 'Natl Champ'
                      }
                      weekLabel = roundLabels[game.playoff_round] || 'CFP'
                    } else if (game.week_number <= REGULAR_SEASON_END) {
                      weekLabel = `Week ${game.week_number}`
                    } else {
                      weekLabel = SCHEDULE_WEEK_LABELS[game.week_number] || `Week ${game.week_number}`
                    }

                    return (
                      <div
                        key={game.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isCurrentWeek ? 'bg-brand-subtle border border-brand/50' :
                          isPast ? 'bg-surface-subtle' : 'bg-surface-inset'
                        }`}
                      >
                        {/* Week */}
                        <div className="w-20 flex-shrink-0">
                          <span className={`text-xs font-medium ${isCurrentWeek ? 'text-brand-text' : 'text-text-secondary'}`}>
                            {weekLabel}
                          </span>
                        </div>

                        {/* Opponent */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-text-secondary text-xs w-6">{isHome ? 'vs' : '@'}</span>
                          {opponentLogo ? (
                            <img src={opponentLogo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 bg-surface-subtle rounded-full flex-shrink-0" />
                          )}
                          <span className="text-text-primary text-sm truncate">
                            {opponentRank && opponentRank <= 25 && <span className="text-text-muted">#{opponentRank} </span>}
                            {opponentName}
                          </span>
                        </div>

                        {/* Result/Status + Points */}
                        <div className="w-44 text-right flex-shrink-0">
                          {game.status === 'completed' ? (
                            <div className="flex flex-col items-end">
                              <span className={`text-sm font-semibold ${
                                isWin ? 'text-success-text' : isLoss ? 'text-danger-text' : 'text-text-secondary'
                              }`}>
                                {isWin ? 'W' : isLoss ? 'L' : 'T'} {myScore}-{oppScore}
                              </span>
                              <div className="flex flex-wrap items-center justify-end gap-1">
                                {gamePoints > 0 && <span className="text-xs text-brand-text">+{gamePoints} pts</span>}
                                {eventBonusList.map((eb, i) => (
                                  <span key={i} className="text-xs text-info-text">
                                    +{eb.points} {eb.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : game.status === 'live' ? (
                            <span className="text-warning-text text-sm animate-pulse">LIVE</span>
                          ) : (
                            <span className="text-text-muted text-xs">
                              {new Date(`${game.game_date}T${game.game_time || '12:00:00'}`).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}

                {getSchoolGames(selectedSchool.id).length === 0 && (
                  <p className="text-text-muted text-sm text-center py-4">No games scheduled</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface/50">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-full py-2 bg-surface hover:bg-surface-subtle text-text-primary rounded-lg transition-colors text-sm"
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
