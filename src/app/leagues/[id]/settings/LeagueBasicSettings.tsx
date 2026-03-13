'use client'

import type { LeagueSettings, League } from './types'

interface LeagueBasicSettingsProps {
  settings: LeagueSettings
  setSettings: (s: LeagueSettings) => void
  league: League
  setLeague: (l: League) => void
  isCommissioner: boolean
  isDraftStarted: boolean
  saving: boolean
  onSave: () => void
}

export function LeagueBasicSettings({
  settings, setSettings, league, setLeague,
  isCommissioner, isDraftStarted, saving, onSave,
}: LeagueBasicSettingsProps) {
  return (
    <section className="bg-surface rounded-lg p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Basic Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary mb-2">League Name</label>
          <input
            type="text"
            value={league.name}
            onChange={(e) => setLeague({ ...league, name: e.target.value })}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Number of Teams (2-30)</label>
          <input
            type="number"
            min="2"
            max="30"
            value={league.max_teams}
            onChange={(e) => setLeague({ ...league, max_teams: parseInt(e.target.value) || 2 })}
            disabled={isDraftStarted}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
          />
          <p className="text-text-muted text-sm mt-1">Can be any number from 2-30, not just even numbers</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPublic"
            checked={league.is_public}
            onChange={(e) => setLeague({ ...league, is_public: e.target.checked })}
            className="w-5 h-5 rounded border-border bg-surface"
          />
          <label htmlFor="isPublic" className="text-text-secondary">
            Public League (visible to everyone)
          </label>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Entry Fee ($) <span className="text-text-muted text-xs">(optional)</span></label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.entry_fee}
            onChange={(e) => setSettings({ ...settings, entry_fee: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Prize Pool ($) <span className="text-text-muted text-xs">(optional)</span></label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.prize_pool}
            onChange={(e) => setSettings({ ...settings, prize_pool: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        {/* Prize Distribution */}
        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-lg font-medium text-text-primary mb-4">Prize Distribution</h3>

          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="highPoints"
              checked={settings.high_points_enabled}
              onChange={(e) => setSettings({ ...settings, high_points_enabled: e.target.checked })}
              className="w-5 h-5 rounded border-border bg-surface"
            />
            <label htmlFor="highPoints" className="text-text-secondary">
              Enable Weekly High Points Prize
            </label>
          </div>

          {settings.high_points_enabled && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-text-secondary mb-2">Weekly Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.high_points_weekly_amount}
                  onChange={(e) => setSettings({ ...settings, high_points_weekly_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-2">Number of Weeks</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.high_points_weeks}
                  onChange={(e) => setSettings({ ...settings, high_points_weeks: parseInt(e.target.value) || 15 })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-2">Number of Winners</label>
              <select
                value={settings.num_winners}
                onChange={(e) => setSettings({ ...settings, num_winners: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
              >
                <option value="1">1 Winner</option>
                <option value="2">2 Winners</option>
                <option value="3">3 Winners</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary mb-2">Allow Ties for High Points</label>
              <select
                value={settings.high_points_allow_ties ? 'yes' : 'no'}
                onChange={(e) => setSettings({ ...settings, high_points_allow_ties: e.target.value === 'yes' })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
              >
                <option value="yes">Yes - Split Prize</option>
                <option value="no">No - Tiebreaker</option>
              </select>
            </div>
          </div>

          {settings.num_winners >= 1 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-text-secondary mb-2">1st Place %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.winner_percentage}
                  onChange={(e) => setSettings({ ...settings, winner_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
                />
              </div>
              {settings.num_winners >= 2 && (
                <div>
                  <label className="block text-text-secondary mb-2">2nd Place %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.runner_up_percentage}
                    onChange={(e) => setSettings({ ...settings, runner_up_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
                  />
                </div>
              )}
              {settings.num_winners >= 3 && (
                <div>
                  <label className="block text-text-secondary mb-2">3rd Place %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.third_place_percentage}
                    onChange={(e) => setSettings({ ...settings, third_place_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {isCommissioner && (
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
          >
            {saving ? 'Saving...' : 'Save Basic Settings'}
          </button>
        )}
      </div>
    </section>
  )
}
