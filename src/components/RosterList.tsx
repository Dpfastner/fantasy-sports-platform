'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RosterRow } from './RosterRow'

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
}

interface SchoolPoints {
  school_id: string
  week_number: number
  total_points: number
}

interface Props {
  roster: RosterSchool[]
  games: Game[]
  schoolPoints: SchoolPoints[]
  currentWeek: number
  teamId: string
  seasonId: string
  doublePointsEnabled: boolean
  maxDoublePicksPerSeason: number
}

export function RosterList({
  roster,
  games,
  schoolPoints,
  currentWeek,
  teamId,
  seasonId,
  doublePointsEnabled,
  maxDoublePicksPerSeason
}: Props) {
  const supabase = createClient()
  const [doublePickSchoolId, setDoublePickSchoolId] = useState<string | null>(null)
  const [canPick, setCanPick] = useState(true)
  const [picksUsed, setPicksUsed] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (doublePointsEnabled) {
      loadDoublePicks()
    }
  }, [teamId, currentWeek, doublePointsEnabled])

  const loadDoublePicks = async () => {
    // Get all picks for the season
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

    // Check if we can still pick (before first game)
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
        if (firstGame.status === 'live' || firstGame.status === 'completed' || new Date() >= gameTime) {
          setCanPick(false)
        }
      }
    }
  }

  const handleDoublePointsSelect = async (schoolId: string) => {
    if (!canPick || saving) return

    // Check max picks limit
    if (maxDoublePicksPerSeason > 0 && picksUsed >= maxDoublePicksPerSeason && !doublePickSchoolId) {
      return
    }

    setSaving(true)

    try {
      if (doublePickSchoolId) {
        // Update existing pick
        await supabase
          .from('weekly_double_picks')
          .update({ school_id: schoolId, picked_at: new Date().toISOString() })
          .eq('fantasy_team_id', teamId)
          .eq('week_number', currentWeek)
      } else {
        // Insert new pick
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

  // Build points by school
  const schoolPointsMap = new Map<string, SchoolPoints[]>()
  for (const sp of schoolPoints) {
    const existing = schoolPointsMap.get(sp.school_id) || []
    existing.push(sp)
    schoolPointsMap.set(sp.school_id, existing)
  }

  // Calculate totals
  const schoolTotals = new Map<string, number>()
  for (const sp of schoolPoints) {
    const current = schoolTotals.get(sp.school_id) || 0
    schoolTotals.set(sp.school_id, current + Number(sp.total_points))
  }

  // Check if max picks reached
  const maxPicksReached = maxDoublePicksPerSeason > 0 && picksUsed >= maxDoublePicksPerSeason && !doublePickSchoolId

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center px-3 py-2 text-xs text-gray-500 uppercase tracking-wide">
        <span className="w-6 text-center">#</span>
        <span className="w-10 ml-2"></span>
        <span className="min-w-[140px] ml-2">School</span>
        <span className="w-px mx-2"></span>
        {doublePointsEnabled && (
          <>
            <span className="w-12 text-center">2x</span>
            <span className="w-px mx-2"></span>
          </>
        )}
        <span className="min-w-[120px]">Opponent</span>
        <span className="w-px mx-2"></span>
        <span className="w-20 text-center">Score</span>
        <span className="w-px mx-2"></span>
        <span className="ml-auto text-right">Points</span>
      </div>

      {/* Roster rows */}
      {roster.map((slot, index) => {
        const thisWeekGame = games.find(
          g => g.week_number === currentWeek &&
               (g.home_school_id === slot.school_id || g.away_school_id === slot.school_id)
        )
        const weeklyPts = schoolPointsMap.get(slot.school_id) || []
        const total = schoolTotals.get(slot.school_id) || 0

        return (
          <RosterRow
            key={slot.id}
            index={index + 1}
            schoolId={slot.school_id}
            school={slot.schools}
            game={thisWeekGame || null}
            weeklyPoints={weeklyPts}
            totalPoints={total}
            currentWeek={currentWeek}
            teamId={teamId}
            doublePointsEnabled={doublePointsEnabled}
            isDoublePointsPick={doublePickSchoolId === slot.school_id}
            canPickDoublePoints={canPick && !maxPicksReached && !saving}
            onDoublePointsSelect={handleDoublePointsSelect}
          />
        )
      })}

      {/* Double points info */}
      {doublePointsEnabled && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 border-t border-gray-700 mt-4">
          <span>
            Double Points: {maxDoublePicksPerSeason > 0 ? `${picksUsed}/${maxDoublePicksPerSeason} used` : 'Unlimited'}
          </span>
          {!canPick && <span className="text-yellow-500">Deadline passed for this week</span>}
        </div>
      )}
    </div>
  )
}
