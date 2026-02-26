'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface School {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
}

interface DoublePick {
  id: string
  week_number: number
  school_id: string
  picked_at: string
  points_earned: number
  bonus_points: number
}

interface Props {
  teamId: string
  leagueId: string
  currentWeek: number
  roster: {
    school_id: string
    schools: School
  }[]
  maxPicksPerSeason: number
  seasonId: string
}

interface Game {
  id: string
  game_date: string
  game_time: string | null
  status: string
  home_school_id: string | null
  away_school_id: string | null
}

export function DoublePointsPicker({
  teamId,
  leagueId,
  currentWeek,
  roster,
  maxPicksPerSeason,
  seasonId
}: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPick, setCurrentPick] = useState<DoublePick | null>(null)
  const [allPicks, setAllPicks] = useState<DoublePick[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [canPick, setCanPick] = useState(true)
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadPicksAndDeadline()
  }, [teamId, currentWeek])

  const loadPicksAndDeadline = async () => {
    setLoading(true)
    try {
      // Get all double picks for this team
      const { data: picks } = await supabase
        .from('weekly_double_picks')
        .select('*')
        .eq('fantasy_team_id', teamId)
        .order('week_number', { ascending: true })

      if (picks) {
        setAllPicks(picks)
        const thisWeekPick = picks.find(p => p.week_number === currentWeek)
        setCurrentPick(thisWeekPick || null)
        if (thisWeekPick) {
          setSelectedSchool(thisWeekPick.school_id)
        }
      }

      // Check if we can still make a pick (before first game of the week)
      const schoolIds = roster.map(r => r.school_id)
      if (schoolIds.length > 0) {
        const { data: games } = await supabase
          .from('games')
          .select('game_date, game_time, status')
          .eq('season_id', seasonId)
          .eq('week_number', currentWeek)
          .or(`home_school_id.in.(${schoolIds.join(',')}),away_school_id.in.(${schoolIds.join(',')})`)
          .order('game_date', { ascending: true })
          .order('game_time', { ascending: true })
          .limit(1)

        if (games && games.length > 0) {
          const firstGame = games[0]
          const gameDateTime = new Date(`${firstGame.game_date}T${firstGame.game_time || '12:00:00'}`)
          setDeadline(gameDateTime)

          // Can't pick if first game has started
          if (firstGame.status === 'live' || firstGame.status === 'completed' || new Date() >= gameDateTime) {
            setCanPick(false)
          }
        }
      }
    } catch (err) {
      console.error('Error loading double picks:', err)
    }
    setLoading(false)
  }

  const handleSavePick = async () => {
    if (!selectedSchool) {
      setError('Please select a school')
      return
    }

    // Check max picks limit
    if (maxPicksPerSeason > 0 && allPicks.length >= maxPicksPerSeason && !currentPick) {
      setError(`You've used all ${maxPicksPerSeason} double picks for the season`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (currentPick) {
        // Update existing pick
        const { error: updateError } = await supabase
          .from('weekly_double_picks')
          .update({
            school_id: selectedSchool,
            picked_at: new Date().toISOString()
          })
          .eq('id', currentPick.id)

        if (updateError) throw updateError
      } else {
        // Insert new pick
        const { error: insertError } = await supabase
          .from('weekly_double_picks')
          .insert({
            fantasy_team_id: teamId,
            week_number: currentWeek,
            school_id: selectedSchool
          })

        if (insertError) throw insertError
      }

      setSuccess('Double points pick saved!')
      loadPicksAndDeadline()
    } catch (err: unknown) {
      console.error('Error saving pick:', err)
      setError(err instanceof Error ? err.message : 'Failed to save pick')
    }
    setSaving(false)
  }

  const picksUsed = allPicks.length
  const picksRemaining = maxPicksPerSeason > 0 ? maxPicksPerSeason - picksUsed : 'Unlimited'

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Double Points</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
          <div className="h-10 bg-surface rounded mb-2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-2">Double Points</h2>
      <p className="text-text-secondary text-sm mb-4">
        Pick one school to receive 2x points this week
      </p>

      {/* Stats */}
      <div className="flex justify-between text-sm text-text-secondary mb-4">
        <span>Week {currentWeek}</span>
        <span>Picks remaining: {picksRemaining}</span>
      </div>

      {/* Deadline info */}
      {deadline && canPick && (
        <p className="text-warning-text text-xs mb-3">
          Deadline: {deadline.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </p>
      )}

      {/* School selector */}
      {canPick ? (
        <div className="space-y-3">
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          >
            <option value="">Select a school...</option>
            {roster.map((slot) => (
              <option key={slot.school_id} value={slot.school_id}>
                {slot.schools.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSavePick}
            disabled={saving || !selectedSchool}
            className="w-full bg-info hover:bg-info-hover disabled:bg-info/50 text-text-primary py-2 px-4 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : currentPick ? 'Update Pick' : 'Set Double Points'}
          </button>

          {error && <p className="text-danger-text text-sm">{error}</p>}
          {success && <p className="text-success-text text-sm">{success}</p>}
        </div>
      ) : (
        <div>
          {currentPick ? (
            <div className="p-3 bg-info/20 border border-info rounded-lg">
              <p className="text-info-text text-sm mb-1">This week's pick:</p>
              <div className="flex items-center gap-2">
                {roster.find(r => r.school_id === currentPick.school_id)?.schools.logo_url && (
                  <img
                    src={roster.find(r => r.school_id === currentPick.school_id)?.schools.logo_url || ''}
                    alt=""
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span className="text-text-primary font-medium">
                  {roster.find(r => r.school_id === currentPick.school_id)?.schools.name || 'Unknown'}
                </span>
                <span className="text-info-text text-xs">2x</span>
              </div>
              {currentPick.points_earned > 0 && (
                <p className="text-success-text text-sm mt-2">
                  +{currentPick.bonus_points} bonus points earned!
                </p>
              )}
            </div>
          ) : (
            <p className="text-text-muted text-sm">
              Pick deadline has passed for this week.
            </p>
          )}
        </div>
      )}

      {/* History */}
      {allPicks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Pick History</h3>
          <div className="space-y-1">
            {allPicks.slice(-5).reverse().map((pick) => {
              const school = roster.find(r => r.school_id === pick.school_id)?.schools
              return (
                <div key={pick.id} className="flex justify-between text-sm">
                  <span className="text-text-secondary">
                    Wk {pick.week_number}: {school?.abbreviation || school?.name || 'Unknown'}
                  </span>
                  {pick.bonus_points > 0 && (
                    <span className="text-success-text">+{pick.bonus_points}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
