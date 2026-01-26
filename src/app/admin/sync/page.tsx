'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  }
  notFoundSchools?: string[]
  updates?: { name: string; espnId: string; logoUrl: string }[]
  syncedGames?: { espnId: string; name: string; homeTeam: string; awayTeam: string; status: string }[]
  skippedGames?: string[]
  error?: string
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [syncType, setSyncType] = useState<'schools' | 'games'>('schools')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Game sync parameters
  const [year, setYear] = useState(new Date().getFullYear())
  const [week, setWeek] = useState(1)
  const [seasonType, setSeasonType] = useState(2)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    setError(null)

    try {
      const endpoint = syncType === 'schools' ? '/api/sync/schools' : '/api/sync/games'
      const body = syncType === 'games' ? { year, week, seasonType } : undefined

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fantasy-sports-sync-2024', // This should match SYNC_API_KEY
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Sync failed')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Admin - Data Sync</h1>
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">ESPN Data Sync</h2>
          <p className="text-gray-400 mb-6">
            Sync school logos and game data from ESPN. This will update the database with
            the latest team logos and game scores.
          </p>

          {/* Sync Type Selection */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setSyncType('schools')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                syncType === 'schools'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sync School Logos
            </button>
            <button
              onClick={() => setSyncType('games')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                syncType === 'games'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sync Game Data
            </button>
          </div>

          {/* Game sync parameters */}
          {syncType === 'games' && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Week</label>
                <select
                  value={week}
                  onChange={(e) => setWeek(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  {[...Array(17)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Week {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Season Type</label>
                <select
                  value={seasonType}
                  onChange={(e) => setSeasonType(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value={2}>Regular Season</option>
                  <option value={3}>Postseason</option>
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {syncing ? 'Syncing...' : `Sync ${syncType === 'schools' ? 'School Logos' : 'Games'}`}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sync Results</h3>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {result.summary.totalSchools !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-white">{result.summary.totalSchools}</div>
                  <div className="text-gray-400 text-sm">Total Schools</div>
                </div>
              )}
              {result.summary.matched !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{result.summary.matched}</div>
                  <div className="text-gray-400 text-sm">Matched</div>
                </div>
              )}
              {result.summary.totalGames !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-white">{result.summary.totalGames}</div>
                  <div className="text-gray-400 text-sm">Total Games</div>
                </div>
              )}
              {result.summary.synced !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{result.summary.synced}</div>
                  <div className="text-gray-400 text-sm">Synced</div>
                </div>
              )}
              {result.summary.updated !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{result.summary.updated}</div>
                  <div className="text-gray-400 text-sm">Updated</div>
                </div>
              )}
              {result.summary.skipped !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{result.summary.skipped}</div>
                  <div className="text-gray-400 text-sm">Skipped</div>
                </div>
              )}
              {result.summary.notFound !== undefined && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{result.summary.notFound}</div>
                  <div className="text-gray-400 text-sm">Not Found</div>
                </div>
              )}
              {result.summary.errors !== undefined && result.summary.errors > 0 && (
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{result.summary.errors}</div>
                  <div className="text-gray-400 text-sm">Errors</div>
                </div>
              )}
            </div>

            {/* Updated Schools with Logos */}
            {result.updates && result.updates.length > 0 && (
              <div className="mb-6">
                <h4 className="text-white font-medium mb-2">Updated Schools</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                  {result.updates.map((school) => (
                    <div
                      key={school.espnId}
                      className="bg-gray-700 rounded p-2 flex items-center gap-2"
                    >
                      <img
                        src={school.logoUrl}
                        alt={school.name}
                        className="w-8 h-8 object-contain"
                      />
                      <span className="text-white text-sm truncate">{school.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synced Games */}
            {result.syncedGames && result.syncedGames.length > 0 && (
              <div className="mb-6">
                <h4 className="text-white font-medium mb-2">Synced Games</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.syncedGames.map((game) => (
                    <div
                      key={game.espnId}
                      className="bg-gray-700 rounded p-2 flex justify-between items-center"
                    >
                      <span className="text-white text-sm">{game.name}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          game.status === 'final'
                            ? 'bg-gray-600 text-gray-300'
                            : game.status === 'in_progress'
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white'
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
                <h4 className="text-yellow-400 font-medium mb-2">Schools Not Found in ESPN</h4>
                <div className="text-gray-400 text-sm">
                  {result.notFoundSchools.join(', ')}
                </div>
              </div>
            )}

            {/* Skipped Games */}
            {result.skippedGames && result.skippedGames.length > 0 && (
              <div>
                <h4 className="text-yellow-400 font-medium mb-2">Skipped Games (missing teams)</h4>
                <div className="text-gray-400 text-sm max-h-40 overflow-y-auto">
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
