'use client'

import { useState } from 'react'
import { runSync } from './actions'

type SyncType = 'schools' | 'games' | 'rankings' | 'bulk' | 'live'

interface SyncResult {
  success: boolean
  summary: {
    totalSchools?: number
    matched?: number
    notFound?: number
    updated?: number
    errors?: number
    totalGames?: number
    synced?: number
    skipped?: number
    year?: number
    week?: number
    seasonType?: string
    pollName?: string
    totalRanked?: number
    weeksProcessed?: number
    totalGamesFound?: number
    totalGamesSynced?: number
    totalGamesSkipped?: number
    gamesChecked?: number
    gamesUpdated?: number
    inProgress?: number
    completed?: number
  }
  notFoundSchools?: string[]
  updates?: { name: string; espnId: string; logoUrl: string }[]
  syncedGames?: { espnId: string; name: string; homeTeam: string; awayTeam: string; status: string }[]
  skippedGames?: string[]
  syncedRankings?: { rank: number; schoolName: string; espnId: string }[]
  skippedTeams?: string[]
  weekResults?: { week: number; seasonType: string; gamesFound: number; gamesSynced: number; gamesSkipped: number }[]
  scoreUpdates?: { game: string; homeScore: number; awayScore: number; status: string; quarter?: string; clock?: string }[]
  error?: string
  skipped?: boolean
  reason?: string
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [syncType, setSyncType] = useState<SyncType>('schools')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Game sync parameters
  const [year, setYear] = useState(new Date().getFullYear())
  const [week, setWeek] = useState(1)
  const [seasonType, setSeasonType] = useState(2)

  // Bulk sync parameters
  const [startWeek, setStartWeek] = useState(0)
  const [endWeek, setEndWeek] = useState(15)
  const [includePostseason, setIncludePostseason] = useState(true)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    setError(null)

    try {
      let body: Record<string, unknown> | undefined

      switch (syncType) {
        case 'games':
          body = { year, week, seasonType }
          break
        case 'rankings':
          body = { year, week }
          break
        case 'bulk':
          body = { year, startWeek, endWeek, includePostseason }
          break
      }

      const result = await runSync(syncType, body)

      if (result.error) {
        setError(result.error)
      } else {
        setResult(result.data as SyncResult)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSyncing(false)
    }
  }

  const syncTypes: { id: SyncType; label: string; description: string }[] = [
    { id: 'schools', label: 'School Logos', description: 'Sync team logos and ESPN IDs' },
    { id: 'games', label: 'Single Week', description: 'Sync games for a specific week' },
    { id: 'rankings', label: 'AP Rankings', description: 'Sync AP Top 25 rankings' },
    { id: 'bulk', label: 'Bulk Sync', description: 'Sync entire season or range' },
    { id: 'live', label: 'Live Scores', description: 'Update live game scores' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-surface rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">ESPN Data Sync</h2>
          <p className="text-text-secondary mb-6">
            Sync data from ESPN including school logos, game schedules, scores, and rankings.
          </p>

          {/* Sync Type Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
            {syncTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSyncType(type.id)}
                className={`py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                  syncType === type.id
                    ? 'bg-brand text-text-primary'
                    : 'bg-surface text-text-secondary hover:bg-surface-subtle'
                }`}
                title={type.description}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Single Week Game Parameters */}
          {syncType === 'games' && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-text-secondary text-sm mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">Week</label>
                <select
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                >
                  <option value={0}>Week 0</option>
                  {[...Array(16)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Week {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">Season Type</label>
                <select
                  value={seasonType}
                  onChange={(e) => setSeasonType(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                >
                  <option value={2}>Regular Season</option>
                  <option value={3}>Postseason</option>
                </select>
              </div>
            </div>
          )}

          {/* Rankings Parameters */}
          {syncType === 'rankings' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-text-secondary text-sm mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1">Week</label>
                <select
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                >
                  {[...Array(17)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Week {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Bulk Sync Parameters */}
          {syncType === 'bulk' && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-1">Start Week</label>
                  <select
                    value={startWeek}
                    onChange={(e) => setStartWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                  >
                    <option value={0}>Week 0</option>
                    {[...Array(15)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Week {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-1">End Week</label>
                  <select
                    value={endWeek}
                    onChange={(e) => setEndWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary"
                  >
                    {[...Array(16)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Week {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={includePostseason}
                  onChange={(e) => setIncludePostseason(e.target.checked)}
                  className="rounded border-border bg-surface text-brand"
                />
                Include postseason (bowls, playoffs)
              </label>
              <p className="text-text-muted text-sm">
                Note: Bulk sync may take a while for large ranges. Each week is synced with a small delay to avoid rate limiting.
              </p>
            </div>
          )}

          {/* Live Scores Info */}
          {syncType === 'live' && (
            <div className="bg-surface rounded p-4 mb-6">
              <p className="text-text-secondary text-sm">
                Live score sync updates all games currently in progress. Use this during game days
                to get the latest scores. This also runs automatically every 15 minutes on Saturdays.
              </p>
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-success hover:bg-success-hover disabled:bg-success/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {syncing ? 'Syncing...' : `Sync ${syncTypes.find(t => t.id === syncType)?.label}`}
          </button>
        </div>

        {/* Cron Info */}
        <div className="bg-surface rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Scheduled Syncs</h3>
          <div className="text-text-secondary text-sm space-y-2">
            <p><span className="text-text-primary">Daily:</span> Rankings and current week games sync at 6 AM ET</p>
            <p><span className="text-text-primary">Saturdays:</span> Live scores sync every 15 minutes</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-danger/10 border border-danger text-danger-text px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-surface rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Sync Results</h3>

            {/* Skipped notice */}
            {result.skipped && (
              <div className="bg-warning/10 border border-warning text-warning-text px-4 py-3 rounded-lg mb-4">
                Sync skipped: {result.reason}
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {result.summary.totalSchools !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-text-primary">{result.summary.totalSchools}</div>
                  <div className="text-text-secondary text-sm">Total Schools</div>
                </div>
              )}
              {result.summary.matched !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-success-text">{result.summary.matched}</div>
                  <div className="text-text-secondary text-sm">Matched</div>
                </div>
              )}
              {result.summary.totalGames !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-text-primary">{result.summary.totalGames}</div>
                  <div className="text-text-secondary text-sm">Total Games</div>
                </div>
              )}
              {result.summary.totalGamesFound !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-text-primary">{result.summary.totalGamesFound}</div>
                  <div className="text-text-secondary text-sm">Games Found</div>
                </div>
              )}
              {result.summary.totalRanked !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-text-primary">{result.summary.totalRanked}</div>
                  <div className="text-text-secondary text-sm">Ranked Teams</div>
                </div>
              )}
              {result.summary.synced !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-success-text">{result.summary.synced}</div>
                  <div className="text-text-secondary text-sm">Synced</div>
                </div>
              )}
              {result.summary.totalGamesSynced !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-success-text">{result.summary.totalGamesSynced}</div>
                  <div className="text-text-secondary text-sm">Games Synced</div>
                </div>
              )}
              {result.summary.gamesUpdated !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-success-text">{result.summary.gamesUpdated}</div>
                  <div className="text-text-secondary text-sm">Updated</div>
                </div>
              )}
              {result.summary.inProgress !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-warning-text">{result.summary.inProgress}</div>
                  <div className="text-text-secondary text-sm">In Progress</div>
                </div>
              )}
              {result.summary.completed !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-brand-text">{result.summary.completed}</div>
                  <div className="text-text-secondary text-sm">Completed</div>
                </div>
              )}
              {result.summary.weeksProcessed !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-brand-text">{result.summary.weeksProcessed}</div>
                  <div className="text-text-secondary text-sm">Weeks Processed</div>
                </div>
              )}
              {result.summary.updated !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-brand-text">{result.summary.updated}</div>
                  <div className="text-text-secondary text-sm">Updated</div>
                </div>
              )}
              {result.summary.skipped !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-warning-text">{result.summary.skipped}</div>
                  <div className="text-text-secondary text-sm">Skipped</div>
                </div>
              )}
              {result.summary.totalGamesSkipped !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-warning-text">{result.summary.totalGamesSkipped}</div>
                  <div className="text-text-secondary text-sm">Games Skipped</div>
                </div>
              )}
              {result.summary.notFound !== undefined && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-warning-text">{result.summary.notFound}</div>
                  <div className="text-text-secondary text-sm">Not Found</div>
                </div>
              )}
              {result.summary.errors !== undefined && result.summary.errors > 0 && (
                <div className="bg-surface rounded p-3 text-center">
                  <div className="text-2xl font-bold text-danger-text">{result.summary.errors}</div>
                  <div className="text-text-secondary text-sm">Errors</div>
                </div>
              )}
            </div>

            {/* Updated Schools with Logos */}
            {result.updates && result.updates.length > 0 && (
              <div className="mb-6">
                <h4 className="text-text-primary font-medium mb-2">Updated Schools</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                  {result.updates.map((school) => (
                    <div
                      key={school.espnId}
                      className="bg-surface rounded p-2 flex items-center gap-2"
                    >
                      <img
                        src={school.logoUrl}
                        alt={school.name}
                        className="w-8 h-8 object-contain"
                      />
                      <span className="text-text-primary text-sm truncate">{school.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synced Rankings */}
            {result.syncedRankings && result.syncedRankings.length > 0 && (
              <div className="mb-6">
                <h4 className="text-text-primary font-medium mb-2">
                  {result.summary.pollName || 'AP Top 25'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                  {result.syncedRankings.map((team) => (
                    <div
                      key={team.espnId}
                      className="bg-surface rounded p-2 flex items-center gap-2"
                    >
                      <span className="text-brand-text font-bold w-6 text-right">#{team.rank}</span>
                      <span className="text-text-primary text-sm truncate">{team.schoolName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk Week Results */}
            {result.weekResults && result.weekResults.length > 0 && (
              <div className="mb-6">
                <h4 className="text-text-primary font-medium mb-2">Week-by-Week Results</h4>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {result.weekResults.map((week) => (
                    <div
                      key={`${week.seasonType}-${week.week}`}
                      className="bg-surface rounded p-2 flex justify-between items-center text-sm"
                    >
                      <span className="text-text-primary">
                        {week.seasonType === 'postseason' ? 'Postseason' : `Week ${week.week}`}
                      </span>
                      <span className="text-text-secondary">
                        {week.gamesSynced}/{week.gamesFound} synced
                        {week.gamesSkipped > 0 && (
                          <span className="text-warning-text"> ({week.gamesSkipped} skipped)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Score Updates */}
            {result.scoreUpdates && result.scoreUpdates.length > 0 && (
              <div className="mb-6">
                <h4 className="text-text-primary font-medium mb-2">Score Updates</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.scoreUpdates.map((game, i) => (
                    <div
                      key={i}
                      className="bg-surface rounded p-3 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-text-primary text-sm">{game.game}</span>
                        <span className="text-text-secondary text-xs ml-2">
                          {game.homeScore} - {game.awayScore}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            game.status === 'final'
                              ? 'bg-surface-subtle text-text-secondary'
                              : 'bg-success text-text-primary'
                          }`}
                        >
                          {game.status === 'in_progress' && game.quarter
                            ? `Q${game.quarter} ${game.clock}`
                            : game.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synced Games */}
            {result.syncedGames && result.syncedGames.length > 0 && (
              <div className="mb-6">
                <h4 className="text-text-primary font-medium mb-2">Synced Games</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.syncedGames.map((game) => (
                    <div
                      key={game.espnId}
                      className="bg-surface rounded p-2 flex justify-between items-center"
                    >
                      <span className="text-text-primary text-sm">{game.name}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          game.status === 'final'
                            ? 'bg-surface-subtle text-text-secondary'
                            : game.status === 'in_progress'
                            ? 'bg-success text-text-primary'
                            : 'bg-brand text-text-primary'
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not Found Schools */}
            {result.notFoundSchools && result.notFoundSchools.length > 0 && (
              <div className="mb-6">
                <h4 className="text-warning-text font-medium mb-2">Schools Not Found in ESPN</h4>
                <div className="text-text-secondary text-sm">
                  {result.notFoundSchools.join(', ')}
                </div>
              </div>
            )}

            {/* Skipped Teams */}
            {result.skippedTeams && result.skippedTeams.length > 0 && (
              <div className="mb-6">
                <h4 className="text-warning-text font-medium mb-2">Skipped Ranked Teams</h4>
                <div className="text-text-secondary text-sm">
                  {result.skippedTeams.join(', ')}
                </div>
              </div>
            )}

            {/* Skipped Games */}
            {result.skippedGames && result.skippedGames.length > 0 && (
              <div>
                <h4 className="text-warning-text font-medium mb-2">Skipped Games (missing teams)</h4>
                <div className="text-text-secondary text-sm max-h-40 overflow-y-auto">
                  {result.skippedGames.map((game, i) => (
                    <div key={i}>{game}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
