'use client'

import type { LeagueSettings } from './types'

interface LeagueRosterSettingsProps {
  settings: LeagueSettings
  setSettings: (s: LeagueSettings) => void
  isCommissioner: boolean
  isDraftStarted: boolean
  saving: boolean
  onSave: () => void
}

export function LeagueRosterSettings({
  settings, setSettings, isCommissioner, isDraftStarted, saving, onSave,
}: LeagueRosterSettingsProps) {
  return (
    <section className="bg-surface rounded-lg p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Roster Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary mb-2">Schools per Team</label>
          <select
            value={settings.schools_per_team}
            onChange={(e) => setSettings({ ...settings, schools_per_team: parseInt(e.target.value) })}
            disabled={isDraftStarted}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
          >
            {[6, 8, 10, 12, 14, 16, 18, 20].map(n => (
              <option key={n} value={n}>{n} schools</option>
            ))}
          </select>
          <p className="text-text-muted text-sm mt-1">How many schools each team drafts (12 recommended)</p>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Max Times a School Can Be on One Team</label>
          <select
            value={settings.max_school_selections_per_team}
            onChange={(e) => setSettings({ ...settings, max_school_selections_per_team: parseInt(e.target.value) })}
            disabled={isDraftStarted}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
          >
            <option value="1">1 time (recommended)</option>
            <option value="2">2 times</option>
            <option value="3">3 times</option>
          </select>
          <p className="text-text-muted text-sm mt-1">Usually 1 - each team can only have a school once</p>
        </div>

        {isCommissioner && (
          <button
            onClick={onSave}
            disabled={saving || isDraftStarted}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
          >
            {saving ? 'Saving...' : 'Save Roster Settings'}
          </button>
        )}
      </div>
    </section>
  )
}
