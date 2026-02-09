'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useToast } from './Toast'

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

interface TransactionsClientProps {
  leagueId: string
  leagueName: string
  seasonId: string
  teamId: string
  teamName: string
  currentWeek: number
  roster: RosterSchool[]
  allSchools: School[]
  schoolPointsMap: Record<string, number>
  rankingsMap: Record<string, number>
  schoolRecordsMap: Record<string, { wins: number; losses: number; confWins: number; confLosses: number }>
  schoolSelectionCounts: Record<string, number>
  transactionHistory: Transaction[]
  addDropsUsed: number
  maxAddDrops: number
  maxSelectionsPerSchool: number
  addDropDeadline: string | null
  isDeadlinePassed: boolean
  canMakeTransactions: boolean
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
  schoolPointsMap,
  rankingsMap,
  schoolRecordsMap,
  schoolSelectionCounts,
  transactionHistory,
  addDropsUsed,
  maxAddDrops,
  maxSelectionsPerSchool,
  addDropDeadline,
  isDeadlinePassed,
  canMakeTransactions,
}: TransactionsClientProps) {
  const { addToast } = useToast()
  const [step, setStep] = useState<TransactionStep>('select-drop')
  const [selectedDrop, setSelectedDrop] = useState<RosterSchool | null>(null)
  const [selectedAdd, setSelectedAdd] = useState<School | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [conferenceFilter, setConferenceFilter] = useState<string>('all')
  const [showRankedOnly, setShowRankedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'rank' | 'record' | 'confRecord'>('points')
  // Record filter removed - users can sort by record instead
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

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

    // Sort
    schools.sort((a, b) => {
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
  }, [allSchools, rosterSchoolIds, schoolSelectionCounts, maxSelectionsPerSchool, searchQuery, conferenceFilter, showRankedOnly, sortBy, schoolPointsMap, rankingsMap, schoolRecordsMap])

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

  const handleConfirm = async () => {
    if (!selectedDrop || !selectedAdd) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          leagueId,
          seasonId,
          weekNumber: currentWeek,
          droppedSchoolId: selectedDrop.school_id,
          addedSchoolId: selectedAdd.id,
          slotNumber: selectedDrop.slot_number,
          rosterPeriodId: selectedDrop.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Transaction failed')
      }

      // Show success toast and refresh the page
      addToast(`Successfully dropped ${selectedDrop.schools.name} and added ${selectedAdd.name}`, 'success')

      // Short delay before refresh to show toast
      setTimeout(() => {
        window.location.reload()
      }, 1500)
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-lg md:text-2xl font-bold text-white">
            Fantasy Sports
          </Link>
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href={`/leagues/${leagueId}/team`}
              className="text-gray-400 hover:text-white transition-colors text-sm md:text-base"
            >
              Team
            </Link>
            <Link
              href={`/leagues/${leagueId}`}
              className="text-gray-400 hover:text-white transition-colors text-sm md:text-base truncate max-w-[100px] md:max-w-none"
            >
              {leagueName}
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Add/Drop</h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">Week {currentWeek}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-gray-400 text-sm md:text-base">
              Transactions: <span className="text-white font-semibold">{addDropsUsed} / {maxAddDrops}</span>
            </p>
            {addDropDeadline && (
              <p className="text-gray-500 text-xs md:text-sm">
                Deadline: {new Date(addDropDeadline).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {isDeadlinePassed && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">
              The add/drop deadline has passed. No more transactions can be made this season.
            </p>
          </div>
        )}

        {!isDeadlinePassed && addDropsUsed >= maxAddDrops && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <p className="text-yellow-400">
              You have used all {maxAddDrops} transactions for this season.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {canMakeTransactions ? (
          <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
            {/* Transaction Flow */}
            <div className="lg:col-span-2">
              {/* Progress Steps */}
              <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
                <div className={`flex items-center gap-1 md:gap-2 ${step === 'select-drop' ? 'text-blue-400' : 'text-gray-500'}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 text-xs md:text-base rounded-full flex items-center justify-center ${step === 'select-drop' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    1
                  </div>
                  <span className="text-sm md:text-base hidden sm:inline">Select Drop</span>
                  <span className="text-xs sm:hidden">Drop</span>
                </div>
                <div className="flex-1 h-px bg-gray-700" />
                <div className={`flex items-center gap-1 md:gap-2 ${step === 'select-add' ? 'text-blue-400' : 'text-gray-500'}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 text-xs md:text-base rounded-full flex items-center justify-center ${step === 'select-add' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    2
                  </div>
                  <span className="text-sm md:text-base hidden sm:inline">Select Add</span>
                  <span className="text-xs sm:hidden">Add</span>
                </div>
                <div className="flex-1 h-px bg-gray-700" />
                <div className={`flex items-center gap-1 md:gap-2 ${step === 'confirm' ? 'text-blue-400' : 'text-gray-500'}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 text-xs md:text-base rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    3
                  </div>
                  <span className="text-sm md:text-base">Confirm</span>
                </div>
              </div>

              {/* Step 1: Select Drop */}
              {step === 'select-drop' && (
                <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Select a school to drop</h2>
                  <div className="space-y-2 md:space-y-3">
                    {roster.map((entry) => {
                      const record = schoolRecordsMap[entry.school_id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
                      return (
                        <button
                          key={entry.id}
                          onClick={() => handleSelectDrop(entry)}
                          className="w-full flex items-center justify-between p-3 md:p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            {entry.schools.logo_url ? (
                              <img
                                src={entry.schools.logo_url}
                                alt={entry.schools.name}
                                className="w-8 h-8 md:w-10 md:h-10 object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-600 rounded-full" />
                            )}
                            <div>
                              <p className="text-white font-medium">{entry.schools.name}</p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">{entry.schools.conference}</span>
                                <span className={record.wins > record.losses ? 'text-green-400' : record.wins < record.losses ? 'text-red-400' : 'text-gray-400'}>
                                  {record.wins}-{record.losses}
                                </span>
                                {(record.confWins > 0 || record.confLosses > 0) && (
                                  <span className="text-gray-500 text-xs">
                                    ({record.confWins}-{record.confLosses})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              {schoolPointsMap[entry.school_id] || 0} pts
                            </p>
                            {rankingsMap[entry.school_id] && (
                              <p className="text-gray-400 text-sm">#{rankingsMap[entry.school_id]}</p>
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
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Select a school to add</h2>
                    <button
                      onClick={handleBack}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  {/* Selected Drop */}
                  <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm mb-1">Dropping:</p>
                    <p className="text-white font-medium">{selectedDrop?.schools.name}</p>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="col-span-2 md:col-span-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={conferenceFilter}
                      onChange={(e) => setConferenceFilter(e.target.value)}
                      className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Conf</option>
                      {conferences.map(conf => (
                        <option key={conf} value={conf}>{conf}</option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'points' | 'rank' | 'record' | 'confRecord')}
                      className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="points">By Points</option>
                      <option value="rank">By Rank</option>
                      <option value="record">By Record</option>
                      <option value="confRecord">By Conf Record</option>
                      <option value="name">By Name</option>
                    </select>
                    <label className="col-span-2 md:col-span-1 flex items-center gap-2 text-gray-400 text-sm">
                      <input
                        type="checkbox"
                        checked={showRankedOnly}
                        onChange={(e) => setShowRankedOnly(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      Ranked only
                    </label>
                  </div>

                  {/* Available Schools */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableSchools.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No schools match your filters</p>
                    ) : (
                      availableSchools.map((school) => {
                        const selectionCount = schoolSelectionCounts[school.id] || 0
                        const record = schoolRecordsMap[school.id] || { wins: 0, losses: 0 }
                        return (
                          <button
                            key={school.id}
                            onClick={() => handleSelectAdd(school)}
                            className="w-full flex items-center justify-between p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
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
                                <p className="text-white text-sm font-medium">
                                  {rankingsMap[school.id] && (
                                    <span className="text-yellow-400 mr-1">#{rankingsMap[school.id]}</span>
                                  )}
                                  {school.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">{school.conference}</span>
                                  <span className={record.wins > record.losses ? 'text-green-400' : record.wins < record.losses ? 'text-red-400' : 'text-gray-400'}>
                                    {record.wins}-{record.losses}
                                  </span>
                                  {(record.confWins > 0 || record.confLosses > 0) && (
                                    <span className="text-gray-500">
                                      ({record.confWins}-{record.confLosses} conf)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-sm font-medium">
                                {schoolPointsMap[school.id] || 0} pts
                              </p>
                              {selectionCount > 0 && (
                                <p className="text-gray-500 text-xs">
                                  {selectionCount}/{maxSelectionsPerSchool} taken
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && selectedDrop && selectedAdd && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Confirm Transaction</h2>
                    <button
                      onClick={handleBack}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Drop */}
                    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                      <p className="text-red-400 text-sm mb-3">Dropping</p>
                      <div className="flex items-center gap-4">
                        {selectedDrop.schools.logo_url ? (
                          <img
                            src={selectedDrop.schools.logo_url}
                            alt={selectedDrop.schools.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-600 rounded-full" />
                        )}
                        <div>
                          <p className="text-white font-medium">{selectedDrop.schools.name}</p>
                          <p className="text-gray-400 text-sm">{selectedDrop.schools.conference}</p>
                          <p className="text-gray-500 text-sm">
                            {schoolPointsMap[selectedDrop.school_id] || 0} pts this season
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Add */}
                    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                      <p className="text-green-400 text-sm mb-3">Adding</p>
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
                          <p className="text-white font-medium">
                            {rankingsMap[selectedAdd.id] && (
                              <span className="text-yellow-400 mr-1">#{rankingsMap[selectedAdd.id]}</span>
                            )}
                            {selectedAdd.name}
                          </p>
                          <p className="text-gray-400 text-sm">{selectedAdd.conference}</p>
                          <p className="text-gray-500 text-sm">
                            {schoolPointsMap[selectedAdd.id] || 0} pts this season
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <p className="text-gray-400 text-sm">
                      This transaction will use <span className="text-white font-semibold">1</span> of your remaining{' '}
                      <span className="text-white font-semibold">{maxAddDrops - addDropsUsed}</span> transactions.
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      The new school will earn points starting from Week {currentWeek}.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
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
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Roster</h3>
                <div className="space-y-2">
                  {roster.map((entry) => {
                    const record = schoolRecordsMap[entry.school_id] || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          selectedDrop?.id === entry.id ? 'bg-red-900/30 border border-red-700' : 'bg-gray-700/30'
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
                            <div className="w-6 h-6 bg-gray-600 rounded-full" />
                          )}
                          <div>
                            <span className="text-white text-sm">{entry.schools.abbreviation || entry.schools.name}</span>
                            <span className={`ml-1 text-xs ${record.wins > record.losses ? 'text-green-400' : record.wins < record.losses ? 'text-red-400' : 'text-gray-500'}`}>
                              {record.wins}-{record.losses}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">{schoolPointsMap[entry.school_id] || 0}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">
              {isDeadlinePassed
                ? 'The transaction deadline has passed for this season.'
                : 'You have used all your transactions for this season.'}
            </p>
            <Link
              href={`/leagues/${leagueId}/team`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              View My Team
            </Link>
          </div>
        )}

        {/* League Transaction History */}
        <div className="mt-8">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
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
            <div className="bg-gray-800 rounded-lg p-6">
              {transactionHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions in this league yet</p>
              ) : (
                <div className="space-y-3">
                  {transactionHistory.map((tx) => {
                    const isMyTransaction = tx.fantasy_team_id === teamId

                    return (
                      <div
                        key={tx.id}
                        className={`p-4 rounded-lg ${
                          isMyTransaction ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isMyTransaction ? 'text-blue-400' : 'text-gray-300'}`}>
                            {tx.team_name}
                            {isMyTransaction && <span className="text-gray-500 ml-2">(You)</span>}
                          </span>
                          <div className="text-right">
                            <span className="text-gray-400 text-sm">Week {tx.week_number}</span>
                            <span className="text-gray-600 text-sm ml-2">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Dropped */}
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 text-sm">-</span>
                            {tx.dropped_school?.logo_url ? (
                              <img src={tx.dropped_school.logo_url} alt="" className="w-6 h-6 object-contain opacity-60" />
                            ) : (
                              <div className="w-6 h-6 bg-gray-600 rounded-full opacity-60" />
                            )}
                            <span className="text-gray-400 text-sm">{tx.dropped_school?.name}</span>
                          </div>

                          <span className="text-gray-600">→</span>

                          {/* Added */}
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 text-sm">+</span>
                            {tx.added_school?.logo_url ? (
                              <img src={tx.added_school.logo_url} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <div className="w-6 h-6 bg-gray-600 rounded-full" />
                            )}
                            <span className="text-white text-sm">{tx.added_school?.name}</span>
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
