'use client'

import { SCORING_PRESETS, getPresetValues, type ScoringPresetKey } from '@/lib/scoring-presets'
import type { LeagueSettings } from './types'

interface LeagueScoringSettingsProps {
  settings: LeagueSettings
  setSettings: (s: LeagueSettings) => void
  selectedPreset: ScoringPresetKey
  setSelectedPreset: (p: ScoringPresetKey) => void
  updateScoringField: (field: string, value: number) => void
  isCommissioner: boolean
  saving: boolean
  onSave: () => void
  onConfirmReset: () => Promise<boolean>
}

export function LeagueScoringSettings({
  settings, setSettings, selectedPreset, setSelectedPreset, updateScoringField,
  isCommissioner, saving, onSave, onConfirmReset,
}: LeagueScoringSettingsProps) {
  return (
    <section className="bg-surface rounded-lg p-6">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Scoring Settings</h2>

      {/* Scoring Preset Selector */}
      <div className="mb-8 p-4 bg-background rounded-lg border border-border">
        <label className="block text-text-secondary mb-2 text-sm font-medium">Scoring Preset</label>
        <select
          value={selectedPreset}
          onChange={(e) => {
            const key = e.target.value as ScoringPresetKey
            setSelectedPreset(key)
            if (key !== 'custom') {
              const values = getPresetValues(key)
              if (values) {
                setSettings({ ...settings, ...values, scoring_preset: key } as LeagueSettings)
              }
            }
          }}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary mb-2"
        >
          {SCORING_PRESETS.map((preset) => (
            <option key={preset.key} value={preset.key}>{preset.label}</option>
          ))}
          <option value="custom">Custom</option>
        </select>
        <p className="text-text-muted text-xs">
          {selectedPreset === 'custom'
            ? 'You have custom scoring values. Select a preset to reset all fields, or adjust individual values below.'
            : SCORING_PRESETS.find((p) => p.key === selectedPreset)?.description}
        </p>
      </div>

      {/* Preset Summary — shown when a preset is active (not Custom) */}
      {selectedPreset !== 'custom' && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Scoring Summary</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {[
              { label: 'Win', field: 'points_win' },
              { label: 'Loss', field: 'points_loss' },
              { label: 'Conference Game', field: 'points_conference_game' },
              { label: 'Conference Game (L)', field: 'points_conference_game_loss' },
              { label: '50+ Points', field: 'points_over_50' },
              { label: 'Shutout', field: 'points_shutout' },
              { label: 'Beat Top 10', field: 'points_ranked_10' },
              { label: 'Beat Top 25', field: 'points_ranked_25' },
            ].map(({ label, field }) => {
              const val = settings[field as keyof LeagueSettings] as number
              if (val === 0) return null
              return (
                <div key={field} className="flex justify-between py-0.5">
                  <span className="text-text-muted">{label}</span>
                  <span className={`font-medium ${val > 0 ? 'text-success-text' : 'text-danger-text'}`}>
                    {val > 0 ? '+' : ''}{val}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Special Events</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {[
                { label: 'Conf Championship Win', field: 'points_conference_championship_win' },
                { label: 'Heisman Winner', field: 'points_heisman_winner' },
                { label: 'Bowl Appearance', field: 'points_bowl_appearance' },
                { label: 'CFP First Round', field: 'points_playoff_first_round' },
                { label: 'CFP Quarterfinal', field: 'points_playoff_quarterfinal' },
                { label: 'CFP Semifinal', field: 'points_playoff_semifinal' },
                { label: 'Championship Win', field: 'points_championship_win' },
                { label: 'Championship Loss', field: 'points_championship_loss' },
              ].map(({ label, field }) => {
                const val = settings[field as keyof LeagueSettings] as number
                if (val === 0) return null
                return (
                  <div key={field} className="flex justify-between py-0.5">
                    <span className="text-text-muted">{label}</span>
                    <span className={`font-medium ${val > 0 ? 'text-success-text' : 'text-danger-text'}`}>
                      {val > 0 ? '+' : ''}{val}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Scoring Fields — only shown when Custom is selected */}
      {selectedPreset === 'custom' && (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-medium text-brand-text mb-4">Regular Game Points</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-success-text">Wins</h4>
                {[
                  { label: 'Base Win Points', field: 'points_win' },
                  { label: 'Conference Game Bonus', field: 'points_conference_game' },
                  { label: 'Score Over 50 Bonus', field: 'points_over_50' },
                  { label: 'Shutout Bonus', field: 'points_shutout' },
                  { label: 'Beat Ranked Top 25', field: 'points_ranked_25' },
                  { label: 'Beat Ranked Top 10', field: 'points_ranked_10' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-text-secondary mb-1 text-sm">{label}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settings[field as keyof LeagueSettings] as number}
                      onChange={(e) => updateScoringField(field, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-danger-text">Losses</h4>
                {[
                  { label: 'Base Loss Points', field: 'points_loss' },
                  { label: 'Conference Game Loss', field: 'points_conference_game_loss' },
                  { label: 'Lose by 50+ Points', field: 'points_over_50_loss' },
                  { label: 'Get Shut Out', field: 'points_shutout_loss' },
                  { label: 'Lose to Ranked Top 25', field: 'points_ranked_25_loss' },
                  { label: 'Lose to Ranked Top 10', field: 'points_ranked_10_loss' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-text-secondary mb-1 text-sm">{label}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settings[field as keyof LeagueSettings] as number}
                      onChange={(e) => updateScoringField(field, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium text-info-text mb-4">Special Events</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Conference Championship Win', field: 'points_conference_championship_win' },
                { label: 'Conference Championship Loss', field: 'points_conference_championship_loss' },
                { label: 'Heisman Winner', field: 'points_heisman_winner' },
                { label: 'Bowl Appearance', field: 'points_bowl_appearance' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-text-secondary mb-1 text-sm">{label}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings[field as keyof LeagueSettings] as number}
                    onChange={(e) => updateScoringField(field, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm"
                  />
                </div>
              ))}
            </div>

            <h4 className="text-md font-medium text-warning-text mt-6 mb-3">Playoff Points</h4>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'First Round', field: 'points_playoff_first_round' },
                { label: 'Quarterfinal', field: 'points_playoff_quarterfinal' },
                { label: 'Semifinal', field: 'points_playoff_semifinal' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-text-secondary mb-1 text-sm">{label}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings[field as keyof LeagueSettings] as number}
                    onChange={(e) => updateScoringField(field, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm"
                  />
                </div>
              ))}
            </div>

            <h4 className="text-md font-medium text-accent-text mt-6 mb-3">National Championship</h4>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Championship Win', field: 'points_championship_win' },
                { label: 'Championship Loss', field: 'points_championship_loss' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-text-secondary mb-1 text-sm">{label}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings[field as keyof LeagueSettings] as number}
                    onChange={(e) => updateScoringField(field, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isCommissioner && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={async () => {
              if (!await onConfirmReset()) return
              const values = getPresetValues('standard')
              if (values && settings) {
                setSettings({ ...settings, ...values, scoring_preset: 'standard' } as LeagueSettings)
                setSelectedPreset('standard')
              }
            }}
            className="bg-surface hover:bg-surface-subtle text-text-secondary font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Scoring Settings'}
          </button>
        </div>
      )}
    </section>
  )
}
