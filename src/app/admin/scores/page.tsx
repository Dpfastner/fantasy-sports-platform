'use client'

import { useState, useEffect, useCallback } from 'react'
import { getGamesForWeek, getSeasonInfo, saveManualScores, clearManualOverrides } from './actions'

interface GameRow {
  id: string
  external_game_id: string | null
  week_number: number
  game_date: string
  game_time: string | null
  home_school_id: string | null
  away_school_id: string | null
  home_team_name: string | null
  home_team_logo_url: string | null
  away_team_name: string | null
  away_team_logo_url: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  status: string
  is_manual_override: boolean
  manual_override_at: string | null
}

interface GameEdit {
  homeScore: number
  awayScore: number
  status: string
}

export default function AdminScoresPage() {
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [seasonYear, setSeasonYear] = useState<number>(new Date().getFullYear())
  const [week, setWeek] = useState(1)
  const [games, setGames] = useState<GameRow[]>([])
  const [edits, setEdits] = useState<Map<string, GameEdit>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load season info on mount
  useEffect(() => {
    getSeasonInfo().then((result) => {
      if (result.data) {
        setSeasonId(result.data.id)
        setSeasonYear(result.data.year)
      }
    })
  }, [])

  const loadGames = useCallback(async () => {
    if (!seasonId) return
    setLoading(true)
    setMessage(null)
    const result = await getGamesForWeek(seasonId, week)
    if (result.data) {
      setGames(result.data as GameRow[])
      setEdits(new Map())
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to load games' })
    }
    setLoading(false)
  }, [seasonId, week])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  const getEdit = (gameId: string): GameEdit | undefined => edits.get(gameId)

  const updateEdit = (gameId: string, field: keyof GameEdit, value: string | number) => {
    const game = games.find((g) => g.id === gameId)
    if (!game) return

    const existing = edits.get(gameId) || {
      homeScore: game.home_score ?? 0,
      awayScore: game.away_score ?? 0,
      status: game.status,
    }

    setEdits(new Map(edits.set(gameId, { ...existing, [field]: value })))
  }

  const handleSave = async () => {
    if (!seasonId || edits.size === 0) return
    setSaving(true)
    setMessage(null)

    const updates = Array.from(edits.entries()).map(([gameId, edit]) => ({
      gameId,
      homeScore: edit.homeScore,
      awayScore: edit.awayScore,
      status: edit.status,
    }))

    const result = await saveManualScores(seasonId, week, updates)

    if (result.success) {
      setMessage({
        type: 'success',
        text: `${result.gamesUpdated} game(s) updated. Points ${result.pointsRecalculated ? 'recalculated' : 'NOT recalculated'}.${result.error ? ` Warning: ${result.error}` : ''}`,
      })
      await loadGames()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save' })
    }
    setSaving(false)
  }

  const handleClearOverrides = async () => {
    if (!seasonId) return
    if (!window.confirm('Clear all manual overrides for this week? ESPN data will be used on next sync.')) return

    setMessage(null)
    const result = await clearManualOverrides(seasonId, week)
    if (result.success) {
      setMessage({ type: 'success', text: `Cleared ${result.cleared} manual override(s).` })
      await loadGames()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to clear overrides' })
    }
  }

  const manualCount = games.filter((g) => g.is_manual_override).length

  return (
    <div className="min-h-screen bg-page">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Manual Score Override</h1>

        {/* Controls */}
        <div className="bg-surface rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-text-muted text-sm mb-1">Season</label>
              <span className="text-text-primary font-medium">{seasonYear}</span>
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-1">Week</label>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="px-3 py-2 bg-surface-subtle border border-border rounded-lg text-text-primary text-sm"
              >
                {Array.from({ length: 23 }, (_, i) => (
                  <option key={i} value={i}>
                    Week {i}{i === 0 ? ' (Preseason)' : i >= 18 ? ' (Playoff)' : i === 15 ? ' (Conf Champ)' : i === 17 ? ' (Bowl)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleSave}
                disabled={saving || edits.size === 0}
                className="px-4 py-2 bg-brand text-brand-text rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : `Save & Recalculate (${edits.size})`}
              </button>
              {manualCount > 0 && (
                <button
                  onClick={handleClearOverrides}
                  className="px-4 py-2 bg-surface-subtle text-text-secondary rounded-lg text-sm hover:bg-surface-inset transition-colors"
                >
                  Clear Overrides ({manualCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg p-4 mb-6 text-sm ${
              message.type === 'success'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Games */}
        <div className="bg-surface rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading games...</div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No games found for Week {week}.</div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_auto_80px_1fr_120px_auto] gap-2 px-4 py-3 text-text-muted text-xs uppercase tracking-wider bg-surface-subtle">
                <span>Away</span>
                <span className="text-center">Score</span>
                <span className="text-center">@</span>
                <span className="text-center">Score</span>
                <span>Home</span>
                <span className="text-center">Status</span>
                <span></span>
              </div>

              {games.map((game) => {
                const edit = getEdit(game.id)
                const awayScore = edit?.awayScore ?? game.away_score ?? 0
                const homeScore = edit?.homeScore ?? game.home_score ?? 0
                const status = edit?.status ?? game.status
                const isEdited = edits.has(game.id)

                return (
                  <div
                    key={game.id}
                    className={`grid grid-cols-[1fr_80px_auto_80px_1fr_120px_auto] gap-2 px-4 py-3 items-center ${
                      isEdited ? 'bg-warning/5' : ''
                    }`}
                  >
                    {/* Away team */}
                    <div className="flex items-center gap-2 min-w-0">
                      {game.away_team_logo_url && (
                        <img src={game.away_team_logo_url} alt="" className="w-6 h-6 shrink-0" />
                      )}
                      <span className="text-text-primary text-sm truncate">
                        {game.away_rank && <span className="text-text-muted">#{game.away_rank} </span>}
                        {game.away_team_name || 'TBD'}
                      </span>
                    </div>

                    {/* Away score */}
                    <input
                      type="number"
                      min={0}
                      value={awayScore}
                      onChange={(e) => updateEdit(game.id, 'awayScore', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-surface-subtle border border-border rounded text-center text-text-primary text-sm"
                    />

                    <span className="text-text-muted text-sm text-center">@</span>

                    {/* Home score */}
                    <input
                      type="number"
                      min={0}
                      value={homeScore}
                      onChange={(e) => updateEdit(game.id, 'homeScore', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-surface-subtle border border-border rounded text-center text-text-primary text-sm"
                    />

                    {/* Home team */}
                    <div className="flex items-center gap-2 min-w-0">
                      {game.home_team_logo_url && (
                        <img src={game.home_team_logo_url} alt="" className="w-6 h-6 shrink-0" />
                      )}
                      <span className="text-text-primary text-sm truncate">
                        {game.home_rank && <span className="text-text-muted">#{game.home_rank} </span>}
                        {game.home_team_name || 'TBD'}
                      </span>
                    </div>

                    {/* Status */}
                    <select
                      value={status}
                      onChange={(e) => updateEdit(game.id, 'status', e.target.value)}
                      className="px-2 py-1 bg-surface-subtle border border-border rounded text-text-primary text-sm"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                    </select>

                    {/* Manual badge */}
                    <div className="w-16 text-center">
                      {game.is_manual_override && (
                        <span className="inline-block px-1.5 py-0.5 bg-warning/20 text-warning text-xs rounded font-medium" title={`Override at ${game.manual_override_at}`}>
                          Manual
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-text-muted text-xs space-y-1">
          <p>Changes are highlighted in yellow. Click &ldquo;Save &amp; Recalculate&rdquo; to update scores and recalculate points for all leagues.</p>
          <p>When ESPN data syncs (daily or gameday), manual overrides are automatically cleared and replaced with ESPN data.</p>
        </div>
      </main>
    </div>
  )
}
