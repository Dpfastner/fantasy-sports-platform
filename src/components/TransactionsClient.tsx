'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from './Toast'
import { Header } from './Header'
import { LeagueNav } from './LeagueNav'
import { WatchlistStar } from './WatchlistStar'
import { fetchWithRetry } from '@/lib/api/fetch'

interface RosterSchool {
  id: string
  school_id: string
  slot_number: number
  start_week: number
  schools: {
    id: string
    name: string
    abbreviation: string | null
    logo_url: string | null
    conference: string
  }
}

interface School {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  primary_color: string
}

interface Transaction {
  id: string
  fantasy_team_id: string
  team_name: string
  week_number: number
  slot_number: number
  created_at: string
  dropped_school: { id: string; name: string; abbreviation: string | null; logo_url: string | null } | null
  added_school: { id: string; name: string; abbreviation: string | null; logo_url: string | null } | null
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
  game_date: string
  game_time: string | null
  is_conference_game?: boolean
  is_bowl_game?: boolean
  is_playoff_game?: boolean
  playoff_round?: string | null // 'first_round', 'quarterfinal', 'semifinal', 'championship'
}

interface SchoolGamePoints {
  game_id: string
  school_id: string
  total_points: number
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

interface TransactionsClientProps {
  leagueId: string
  leagueName: string
  seasonId: string
  teamId: string
  teamName: string
  currentWeek: number
  roster: RosterSchool[]
  allSchools: School[]
  games: Game[]
  schoolPointsMap: Record<string, number>
  rankingsMap: Record<string, number>
  schoolRecordsMap: Record<string, { wins: number; losses: number; confWins: number; confLosses: number }>
  schoolSelectionCounts: Record<string, number>
  schoolGamePoints: SchoolGamePoints[]
  transactionHistory: Transaction[]
  addDropsUsed: number
  maxAddDrops: number
  maxSelectionsPerSchool: number
  addDropDeadline: string | null
  isDeadlinePassed: boolean
  canMakeTransactions: boolean
  userName?: string | null
  userEmail?: string | null
  userId?: string | null
  specialEventSettings?: SpecialEventSettings
  eventBonuses?: EventBonus[]
  watchlistedSchoolIds?: string[]
  maxRosterSize?: number
}

type TransactionStep = 'select-drop' | 'select-add' | 'confirm'

export default function TransactionsClient({
  leagueId,
  leagueName,
  seasonId,
  teamId,
  teamName,
  currentWeek,
  roster,
  allSchools,
  games,
  schoolPointsMap,
  rankingsMap,
  schoolRecordsMap,
  schoolSelectionCounts,
  schoolGamePoints,
  transactionHistory,
  addDropsUsed,
  maxAddDrops,
  maxSelectionsPerSchool,
  addDropDeadline,
  isDeadlinePassed,
  canMakeTransactions,
  userName,
  userEmail,
  userId,
  specialEventSettings,
  eventBonuses = [],
  watchlistedSchoolIds: watchlistedSchoolIdsProp = [],
  maxRosterSize = 12,
}: TransactionsClientProps) {
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<TransactionStep>('select-drop')
  const [selectedDrop, setSelectedDrop] = useState<RosterSchool | null>(null)
  const [selectedAdd, setSelectedAdd] = useState<School | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [conferenceFilter, setConferenceFilter] = useState<string>('all')
  const [showRankedOnly, setShowRankedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'rank' | 'record' | 'confRecord'>('name')
  // Record filter removed - users can sort by record instead
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [localWatchlist, setLocalWatchlist] = useState<Set<string>>(
    () => new Set(watchlistedSchoolIdsProp)
  )
  const [watchlistExpanded, setWatchlistExpanded] = useState(true)

  const handleWatchlistToggle = useCallback((schoolId: string, watchlisted: boolean) => {
    setLocalWatchlist(prev => {
      const next = new Set(prev)
      if (watchlisted) {
        next.add(schoolId)
      } else {
        next.delete(schoolId)
      }
      return next
    })
  }, [])

  // Pre-fill add school from query param (e.g. from team page watchlist click)
  const prefilledAddSchool = useMemo(() => {
    const addSchoolId = searchParams.get('addSchool')
    if (!addSchoolId) return null
    return allSchools.find(s => s.id === addSchoolId) || null
  }, [searchParams, allSchools])

  // Auto-advance: after selecting a drop, if we have a pre-filled add, skip to confirm
  const handleSelectDropWithPrefill = useCallback((rosterEntry: RosterSchool) => {
    setSelectedDrop(rosterEntry)
    setError(null)
    if (prefilledAddSchool) {
      setSelectedAdd(prefilledAddSchool)
      setStep('confirm')
    } else {
      setStep('select-add')
    }
  }, [prefilledAddSchool])

  // Get unique conferences
  const conferences = useMemo(() => {
    const confs = new Set(allSchools.map(s => s.conference))
    return Array.from(confs).sort()
  }, [allSchools])

  // Get school IDs on current roster
  const rosterSchoolIds = useMemo(() => {
    return new Set(roster.map(r => r.school_id))
  }, [roster])

  // Filter and sort available schools
  const availableSchools = useMemo(() => {
    let schools = allSchools.filter(school => {
      // Not on current roster
      if (rosterSchoolIds.has(school.id)) return false

      // Check max selections
      const currentCount = schoolSelectionCounts[school.id] || 0
      if (currentCount >= maxSelectionsPerSchool) return false

      // Search filter - check name, abbreviation, and conference
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim()
        const nameMatch = school.name.toLowerCase().includes(query)
        const abbrMatch = school.abbreviation && school.abbreviation.toLowerCase().includes(query)
        const confMatch = school.conference.toLowerCase().includes(query)

        if (!nameMatch && !abbrMatch && !confMatch) {
          return false
        }
      }

      // Conference filter
      if (conferenceFilter !== 'all' && school.conference !== conferenceFilter) {
        return false
      }

      // Ranked filter
      if (showRankedOnly && !rankingsMap[school.id]) {
        return false
      }

      return true
    })

    // Sort — watchlisted schools first, then by selected sort
    schools.sort((a, b) => {
      const aWatched = localWatchlist.has(a.id) ? 0 : 1
      const bWatched = localWatchlist.has(b.id) ? 0 : 1
      if (aWatched !== bWatched) return aWatched - bWatched

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'points') {
        return (schoolPointsMap[b.id] || 0) - (schoolPointsMap[a.id] || 0)
      } else if (sortBy === 'rank') {
        const rankA = rankingsMap[a.id] || 999
        const rankB = rankingsMap[b.id] || 999
        return rankA - rankB
      } else if (sortBy === 'record') {
        const recordA = schoolRecordsMap[a.id] || { wins: 0, losses: 0 }
        const recordB = schoolRecordsMap[b.id] || { wins: 0, losses: 0 }
        const pctA = recordA.wins + recordA.losses > 0 ? recordA.wins / (recordA.wins + recordA.losses) : 0
        const pctB = recordB.wins + recordB.losses > 0 ? recordB.wins / (recordB.wins + recordB.losses) : 0
        return pctB - pctA
      } else if (sortBy === 'confRecord') {
        const recordA = schoolRecordsMap[a.id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
        const recordB = schoolRecordsMap[b.id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
        const pctA = recordA.confWins + recordA.confLosses > 0 ? recordA.confWins / (recordA.confWins + recordA.confLosses) : 0
        const pctB = recordB.confWins + recordB.confLosses > 0 ? recordB.confWins / (recordB.confWins + recordB.confLosses) : 0
        return pctB - pctA
      }
      return 0
    })

    return schools
  }, [allSchools, rosterSchoolIds, schoolSelectionCounts, maxSelectionsPerSchool, searchQuery, conferenceFilter, showRankedOnly, sortBy, schoolPointsMap, rankingsMap, schoolRecordsMap, localWatchlist])

  // Unavailable (maxed-out) schools — shown when "Show unavailable" is toggled
  const unavailableSchools = useMemo(() => {
    if (!showUnavailable) return []
    return allSchools.filter(school => {
      if (rosterSchoolIds.has(school.id)) return false
      const currentCount = schoolSelectionCounts[school.id] || 0
      if (currentCount < maxSelectionsPerSchool) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim()
        const nameMatch = school.name.toLowerCase().includes(query)
        const abbrMatch = school.abbreviation && school.abbreviation.toLowerCase().includes(query)
        const confMatch = school.conference.toLowerCase().includes(query)
        if (!nameMatch && !abbrMatch && !confMatch) return false
      }
      if (conferenceFilter !== 'all' && school.conference !== conferenceFilter) return false
      if (showRankedOnly && !rankingsMap[school.id]) return false
      return true
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [showUnavailable, allSchools, rosterSchoolIds, schoolSelectionCounts, maxSelectionsPerSchool, searchQuery, conferenceFilter, showRankedOnly, rankingsMap])

  // Watchlisted schools for summary panel
  const watchlistedSchools = useMemo(() => {
    return allSchools.filter(s => localWatchlist.has(s.id))
  }, [allSchools, localWatchlist])

  const handleSelectDrop = (rosterEntry: RosterSchool) => {
    setSelectedDrop(rosterEntry)
    setStep('select-add')
    setError(null)
  }

  const handleSelectAdd = (school: School) => {
    setSelectedAdd(school)
    setStep('confirm')
    setError(null)
  }

  const handleBack = () => {
    if (step === 'select-add') {
      setSelectedDrop(null)
      setStep('select-drop')
    } else if (step === 'confirm') {
      setSelectedAdd(null)
      setStep('select-add')
    }
    setError(null)
  }

  const hasEmptySlot = roster.length < maxRosterSize
  const isAddOnly = hasEmptySlot && !selectedDrop

  const handleConfirm = async () => {
    if (!selectedAdd) return
    if (!isAddOnly && !selectedDrop) return

    setIsSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        teamId,
        leagueId,
        seasonId,
        weekNumber: currentWeek,
        addedSchoolId: selectedAdd.id,
        slotNumber: selectedDrop ? selectedDrop.slot_number : roster.length + 1,
      }
      if (selectedDrop) {
        body.droppedSchoolId = selectedDrop.school_id
        body.rosterPeriodId = selectedDrop.id
      }

      const response = await fetchWithRetry('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Transaction failed')
      }

      const msg = selectedDrop
        ? `Successfully dropped ${selectedDrop.schools.name} and added ${selectedAdd.name}`
        : `Successfully added ${selectedAdd.name}`
      addToast(msg, 'success')

      // Reset form state and refresh server data
      setSelectedDrop(null)
      setSelectedAdd(null)
      setStep('select-drop')
      setIsSubmitting(false)
      setError(null)
      router.refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setError(errorMessage)
      addToast(errorMessage, 'error')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedDrop(null)
    setSelectedAdd(null)
    setStep('select-drop')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={userName} userEmail={userEmail} userId={userId} />

      <LeagueNav leagueId={leagueId} />

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Add/Drop</h1>
            <p className="text-text-secondary mt-1 text-sm md:text-base">Week {currentWeek}</p>
          </div>
          <div className="sm:text-right space-y-1">
            <p className="text-text-secondary text-sm md:text-base">
              <span className="text-text-primary font-semibold">{addDropsUsed}</span> used of {maxAddDrops} &mdash;{' '}
              <span className={`font-semibold ${maxAddDrops - addDropsUsed <= 5 ? 'text-warning-text' : 'text-success-text'}`}>
                {maxAddDrops - addDropsUsed} remaining
              </span>
            </p>
            {addDropDeadline && (
              <p className={`text-xs md:text-sm ${isDeadlinePassed ? 'text-danger-text font-medium' : 'text-text-muted'}`}>
                Deadline: {new Date(addDropDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {!isDeadlinePassed && ` (${Math.ceil((new Date(addDropDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left)`}
              </p>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {isDeadlinePassed && (
          <div className="bg-danger/20 border border-danger rounded-lg p-4 mb-6">
            <p className="text-danger-text">
              The add/drop deadline has passed. No more transactions can be made this season.
            </p>
          </div>
        )}

        {!isDeadlinePassed && addDropsUsed >= maxAddDrops && (
          <div className="bg-highlight-special border border-warning rounded-lg p-4 mb-6">
            <p className="text-warning-text">
              You have used all {maxAddDrops} transactions for this season.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-danger/20 border border-danger rounded-lg p-4 mb-6">
            <p className="text-danger-text">{error}</p>
          </div>
        )}

        {canMakeTransactions ? (
          <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
            {/* Transaction Flow */}
            <div className="lg:col-span-2">
              {/* Progress Steps */}
              <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
                <div className={`flex items-center gap-1 md:gap-2 ${step === 'select-drop' ? 'text-brand-text' : 'text-text-muted'}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 text-xs md:text-base rounded-full flex items-center justify-center ${step === 'select-drop' ? 'bg-brand' : 'bg-surface'}`}>
                    1
                  </div>
                  <span className="text-sm md:text-base hidden sm:inline">Select Drop</span>
                  <span className="text-xs sm:hidden">Drop</span>
                </div>
                <div className="flex-1 h-px bg-surface" />
                <div className={`flex items-center gap-1 md:gap-2 ${step === 'select-add' ? 'text-brand-text' : 'text-text-muted'}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 text-xs md:text-base rounded-full flex items-center justify-center ${step === 'select-add' ? 'bg-brand' : 'bg-surface'}`}>
                    2
                  </div>
                  <span className="text-sm md:text-base hidden sm:inline">Select Add</span>
                  <span className="text-xs sm:hidden">Add</span>
                </div>
                <div className="flex-1 h-px bg-surface" />
                <div className={`flex items-center gap-1 md:gap-2 ${step === 'confirm' ? 'text-brand-text' : 'text-text-muted'}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 text-xs md:text-base rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-brand' : 'bg-surface'}`}>
                    3
                  </div>
                  <span className="text-sm md:text-base">Confirm</span>
                </div>
              </div>

              {/* Step 1: Select Drop */}
              {step === 'select-drop' && (
                <div className="bg-surface rounded-lg p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4">Select a school to drop</h2>
                  {hasEmptySlot && (
                    <button
                      onClick={() => {
                        setSelectedDrop(null)
                        if (prefilledAddSchool) {
                          setSelectedAdd(prefilledAddSchool)
                          setStep('confirm')
                        } else {
                          setStep('select-add')
                        }
                      }}
                      className="w-full mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success-text hover:bg-success/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      You have an empty roster slot — Add a school without dropping
                    </button>
                  )}
                  {prefilledAddSchool && (
                    <div className="bg-success/10 border border-success/50 rounded-lg p-3 mb-4 flex items-center gap-3">
                      <p className="text-success-text text-sm">Adding:</p>
                      {prefilledAddSchool.logo_url && (
                        <img src={prefilledAddSchool.logo_url} alt="" className="w-6 h-6 object-contain" />
                      )}
                      <p className="text-text-primary font-medium text-sm">{prefilledAddSchool.name}</p>
                      <button
                        onClick={() => {
                          // Clear the prefill by navigating without query param
                          window.history.replaceState({}, '', window.location.pathname)
                        }}
                        className="ml-auto text-text-muted hover:text-text-primary text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <div className="space-y-2 md:space-y-3">
                    {roster.map((entry) => {
                      const record = schoolRecordsMap[entry.school_id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
                      return (
                        <button
                          key={entry.id}
                          onClick={() => prefilledAddSchool ? handleSelectDropWithPrefill(entry) : handleSelectDrop(entry)}
                          className="w-full flex items-center justify-between p-3 md:p-4 bg-surface-inset hover:bg-surface rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            {entry.schools.logo_url ? (
                              <img
                                src={entry.schools.logo_url}
                                alt={entry.schools.name}
                                className="w-8 h-8 md:w-10 md:h-10 object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-surface-subtle rounded-full" />
                            )}
                            <div>
                              <span className="text-text-primary font-medium">
                                {entry.schools.name}
                              </span>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-text-secondary">{entry.schools.conference}</span>
                                <span className={record.wins > record.losses ? 'text-success-text' : record.wins < record.losses ? 'text-danger-text' : 'text-text-secondary'}>
                                  {record.wins}-{record.losses}
                                </span>
                                {(record.confWins > 0 || record.confLosses > 0) && (
                                  <span className="text-text-muted text-xs">
                                    ({record.confWins}-{record.confLosses})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-text-primary font-medium">
                              {schoolPointsMap[entry.school_id] || 0} pts
                            </p>
                            {rankingsMap[entry.school_id] && (
                              <p className="text-text-secondary text-sm">#{rankingsMap[entry.school_id]}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Select Add */}
              {step === 'select-add' && (
                <div className="bg-surface rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-text-primary">Select a school to add</h2>
                    <button
                      onClick={handleBack}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  {/* Selected Drop */}
                  <div className="bg-danger/10 border border-danger/50 rounded-lg p-3 mb-4">
                    <p className="text-danger-text text-sm mb-1">Dropping:</p>
                    <p className="text-text-primary font-medium">{selectedDrop?.schools.name}</p>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="col-span-2 md:col-span-1 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <select
                      value={conferenceFilter}
                      onChange={(e) => setConferenceFilter(e.target.value)}
                      className="px-2 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="all">All Conf</option>
                      {conferences.map(conf => (
                        <option key={conf} value={conf}>{conf}</option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'points' | 'rank' | 'record' | 'confRecord')}
                      className="px-2 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="points">By Points</option>
                      <option value="rank">By Rank</option>
                      <option value="record">By Record</option>
                      <option value="confRecord">By Conf Record</option>
                      <option value="name">By Name</option>
                    </select>
                    <label className="col-span-2 md:col-span-1 flex items-center gap-2 text-text-secondary text-sm">
                      <input
                        type="checkbox"
                        checked={showRankedOnly}
                        onChange={(e) => setShowRankedOnly(e.target.checked)}
                        className="rounded bg-surface border-border"
                      />
                      Ranked only
                    </label>
                    <label className="col-span-2 md:col-span-1 flex items-center gap-2 text-text-secondary text-sm">
                      <input
                        type="checkbox"
                        checked={showUnavailable}
                        onChange={(e) => setShowUnavailable(e.target.checked)}
                        className="rounded bg-surface border-border"
                      />
                      Show unavailable
                    </label>
                  </div>

                  {/* Watchlist Summary Panel */}
                  {watchlistedSchools.length > 0 && (
                    <div className="mb-4 border border-warning/30 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setWatchlistExpanded(!watchlistExpanded)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-warning/10 text-sm"
                      >
                        <span className="text-text-primary font-medium flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Your Watchlist ({watchlistedSchools.length})
                        </span>
                        <svg className={`w-4 h-4 text-text-muted transition-transform ${watchlistExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {watchlistExpanded && (
                        <div className="space-y-1 p-2 max-h-48 overflow-y-auto">
                          {watchlistedSchools.map(school => {
                            const record = schoolRecordsMap[school.id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
                            const selCount = schoolSelectionCounts[school.id] || 0
                            const isMaxed = selCount >= maxSelectionsPerSchool
                            return (
                              <button
                                key={school.id}
                                onClick={() => !isMaxed && handleSelectAdd(school)}
                                disabled={isMaxed}
                                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                                  isMaxed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-warning/10 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <WatchlistStar
                                    schoolId={school.id}
                                    leagueId={leagueId}
                                    initialWatchlisted={true}
                                    size="sm"
                                    onToggle={handleWatchlistToggle}
                                  />
                                  {school.logo_url ? (
                                    <img src={school.logo_url} alt="" className="w-6 h-6 object-contain" />
                                  ) : (
                                    <span className="w-6 h-6 rounded-full inline-block" style={{ backgroundColor: school.primary_color }} />
                                  )}
                                  <div>
                                    <span className="text-text-primary text-xs font-medium">
                                      {rankingsMap[school.id] && <span className="text-warning-text mr-1">#{rankingsMap[school.id]}</span>}
                                      {school.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <span className="text-text-muted">{school.conference}</span>
                                      <span className={record.wins > record.losses ? 'text-success-text' : record.wins < record.losses ? 'text-danger-text' : 'text-text-secondary'}>
                                        {record.wins}-{record.losses}
                                      </span>
                                      {(record.confWins > 0 || record.confLosses > 0) && (
                                        <span className="text-text-muted">
                                          ({record.confWins}-{record.confLosses})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <p className="text-text-primary text-xs font-medium">{schoolPointsMap[school.id] || 0} pts</p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    isMaxed
                                      ? 'bg-danger/20 text-danger-text'
                                      : 'bg-success/20 text-success-text'
                                  }`}>
                                    {isMaxed ? 'Taken' : 'Open'}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Available Schools */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableSchools.length === 0 ? (
                      <p className="text-text-muted text-center py-8">No schools match your filters</p>
                    ) : (
                      availableSchools.map((school) => {
                        const selectionCount = schoolSelectionCounts[school.id] || 0
                        const record = schoolRecordsMap[school.id] || { wins: 0, losses: 0 }
                        return (
                          <button
                            key={school.id}
                            onClick={() => handleSelectAdd(school)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left cursor-pointer ${
                              localWatchlist.has(school.id)
                                ? 'bg-warning/5 hover:bg-warning/10'
                                : 'bg-surface-subtle hover:bg-surface-inset'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <WatchlistStar
                                schoolId={school.id}
                                leagueId={leagueId}
                                initialWatchlisted={localWatchlist.has(school.id)}
                                size="md"
                                onToggle={handleWatchlistToggle}
                              />
                              {school.logo_url ? (
                                <img
                                  src={school.logo_url}
                                  alt={school.name}
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full"
                                  style={{ backgroundColor: school.primary_color }}
                                />
                              )}
                              <div>
                                <div className="text-text-primary text-sm font-medium">
                                  {rankingsMap[school.id] && (
                                    <span className="text-warning-text mr-1">#{rankingsMap[school.id]}</span>
                                  )}
                                  <span>{school.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-text-muted">{school.conference}</span>
                                  <span className={record.wins > record.losses ? 'text-success-text' : record.wins < record.losses ? 'text-danger-text' : 'text-text-secondary'}>
                                    {record.wins}-{record.losses}
                                  </span>
                                  {(record.confWins > 0 || record.confLosses > 0) && (
                                    <span className="text-text-muted">
                                      ({record.confWins}-{record.confLosses} conf)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-text-primary text-sm font-medium">
                                {schoolPointsMap[school.id] || 0} pts
                              </p>
                              {selectionCount > 0 && (
                                <p className="text-text-muted text-xs">
                                  {selectionCount}/{maxSelectionsPerSchool} taken
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Unavailable (maxed-out) Schools */}
                  {unavailableSchools.length > 0 && (
                    <div className="mt-4">
                      <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Unavailable ({unavailableSchools.length})</p>
                      <div className="space-y-2">
                        {unavailableSchools.map((school) => (
                          <button
                            key={school.id}
                            onClick={() => addToast(`${school.name} is unavailable — you already have ${maxSelectionsPerSchool} player(s) from this school`, 'info')}
                            className="w-full flex items-center justify-between p-3 bg-surface-subtle rounded-lg opacity-60 cursor-pointer hover:opacity-70 transition-opacity text-left"
                          >
                            <div className="flex items-center gap-3">
                              <WatchlistStar
                                schoolId={school.id}
                                leagueId={leagueId}
                                initialWatchlisted={localWatchlist.has(school.id)}
                                size="md"
                                onToggle={handleWatchlistToggle}
                              />
                              {school.logo_url ? (
                                <img src={school.logo_url} alt={school.name} className="w-8 h-8 object-contain grayscale" />
                              ) : (
                                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: school.primary_color }} />
                              )}
                              <div>
                                <p className="text-text-primary text-sm font-medium line-through">{school.name}</p>
                                <p className="text-text-muted text-xs">{school.conference}</p>
                              </div>
                            </div>
                            <p className="text-text-muted text-xs">{maxSelectionsPerSchool}/{maxSelectionsPerSchool} taken</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && selectedAdd && (selectedDrop || isAddOnly) && (
                <div className="bg-surface rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-text-primary">Confirm Transaction</h2>
                    <button
                      onClick={handleBack}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  <div className={`grid ${selectedDrop ? 'md:grid-cols-2' : ''} gap-6 mb-6`}>
                    {/* Drop */}
                    {selectedDrop && (
                      <div className="bg-danger/10 border border-danger/50 rounded-lg p-4">
                        <p className="text-danger-text text-sm mb-3">Dropping</p>
                        <div className="flex items-center gap-4">
                          {selectedDrop.schools.logo_url ? (
                            <img
                              src={selectedDrop.schools.logo_url}
                              alt={selectedDrop.schools.name}
                              className="w-12 h-12 object-contain"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-surface-subtle rounded-full" />
                          )}
                          <div>
                            <p className="text-text-primary font-medium">{selectedDrop.schools.name}</p>
                            <p className="text-text-secondary text-sm">{selectedDrop.schools.conference}</p>
                            <p className="text-text-muted text-sm">
                              {schoolPointsMap[selectedDrop.school_id] || 0} pts this season
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add */}
                    <div className="bg-success/10 border border-success/50 rounded-lg p-4">
                      <p className="text-success-text text-sm mb-3">Adding</p>
                      <div className="flex items-center gap-4">
                        {selectedAdd.logo_url ? (
                          <img
                            src={selectedAdd.logo_url}
                            alt={selectedAdd.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full"
                            style={{ backgroundColor: selectedAdd.primary_color }}
                          />
                        )}
                        <div>
                          <p className="text-text-primary font-medium">
                            {rankingsMap[selectedAdd.id] && (
                              <span className="text-warning-text mr-1">#{rankingsMap[selectedAdd.id]}</span>
                            )}
                            {selectedAdd.name}
                          </p>
                          <p className="text-text-secondary text-sm">{selectedAdd.conference}</p>
                          <p className="text-text-muted text-sm">
                            {schoolPointsMap[selectedAdd.id] || 0} pts this season
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-inset rounded-lg p-4 mb-6 space-y-2">
                    <p className="text-text-secondary text-sm">
                      This transaction will use <span className="text-text-primary font-semibold">1</span> of your remaining{' '}
                      <span className="text-text-primary font-semibold">{maxAddDrops - addDropsUsed}</span> transactions.
                    </p>
                    <p className="text-text-muted text-sm">
                      The new school will earn points starting from Week {currentWeek}.
                    </p>
                    <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded p-2 mt-2">
                      <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-warning-text text-xs">
                        This transaction is permanent and cannot be undone.{selectedDrop ? ' The dropped school\u2019s points will no longer count toward your total.' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm Transaction'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Roster Preview */}
              <div className="bg-surface rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Current Roster</h3>
                <div className="space-y-2">
                  {roster.map((entry) => {
                    const record = schoolRecordsMap[entry.school_id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          selectedDrop?.id === entry.id ? 'bg-danger/20 border border-danger' : 'bg-surface-subtle'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {entry.schools.logo_url ? (
                            <img
                              src={entry.schools.logo_url}
                              alt=""
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-surface-subtle rounded-full" />
                          )}
                          <div>
                            <span className="text-text-primary text-sm">
                              {entry.schools.abbreviation || entry.schools.name}
                            </span>
                            <span className={`ml-1 text-xs ${record.wins > record.losses ? 'text-success-text' : record.wins < record.losses ? 'text-danger-text' : 'text-text-muted'}`}>
                              {record.wins}-{record.losses}
                            </span>
                          </div>
                        </div>
                        <span className="text-text-secondary text-sm">{schoolPointsMap[entry.school_id] || 0}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-8 text-center">
            <p className="text-text-secondary mb-4">
              {isDeadlinePassed
                ? 'The transaction deadline has passed for this season.'
                : 'You have used all your transactions for this season.'}
            </p>
            <Link
              href={`/leagues/${leagueId}/team`}
              className="inline-block bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              View My Team
            </Link>
          </div>
        )}

        {/* League Transaction History */}
        <div className="mt-8">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium">League Transaction History ({transactionHistory.length})</span>
          </button>

          {showHistory && (
            <div className="bg-surface rounded-lg p-6">
              {transactionHistory.length === 0 ? (
                <p className="text-text-muted text-center py-4">No transactions in this league yet</p>
              ) : (
                <div className="space-y-3">
                  {transactionHistory.map((tx) => {
                    const isMyTransaction = tx.fantasy_team_id === teamId

                    return (
                      <div
                        key={tx.id}
                        className={`p-4 rounded-lg ${
                          isMyTransaction ? 'bg-highlight-row border border-brand/30' : 'bg-surface-subtle'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isMyTransaction ? 'text-brand-text' : 'text-text-secondary'}`}>
                            <Link href={`/leagues/${leagueId}/team/${tx.fantasy_team_id}`} className="hover:underline">{tx.team_name}</Link>
                            {isMyTransaction && <span className="text-text-muted ml-2">(You)</span>}
                          </span>
                          <div className="text-right">
                            <span className="text-text-secondary text-sm">Week {tx.week_number}</span>
                            <span className="text-text-muted text-sm ml-2">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Dropped */}
                          <div className="flex items-center gap-2">
                            <span className="text-danger-text text-sm">-</span>
                            {tx.dropped_school?.logo_url ? (
                              <img src={tx.dropped_school.logo_url} alt="" className="w-6 h-6 object-contain opacity-60" />
                            ) : (
                              <div className="w-6 h-6 bg-surface-subtle rounded-full opacity-60" />
                            )}
                            <span className="text-text-secondary text-sm">{tx.dropped_school?.name}</span>
                          </div>

                          <span className="text-text-muted">→</span>

                          {/* Added */}
                          <div className="flex items-center gap-2">
                            <span className="text-success-text text-sm">+</span>
                            {tx.added_school?.logo_url ? (
                              <img src={tx.added_school.logo_url} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <div className="w-6 h-6 bg-surface-subtle rounded-full" />
                            )}
                            <span className="text-text-primary text-sm">{tx.added_school?.name}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
