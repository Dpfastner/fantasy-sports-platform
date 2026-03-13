'use client'

import type { LeagueSettings, DraftOrderTeam } from './types'

interface LeagueDraftSettingsProps {
  settings: LeagueSettings
  setSettings: (s: LeagueSettings) => void
  isCommissioner: boolean
  isDraftStarted: boolean
  saving: boolean
  onSave: () => void
  draftOrderTeams: DraftOrderTeam[]
  draggedTeamId: string | null
  setDraggedTeamId: (id: string | null) => void
  onMoveDraftOrder: (teamId: string, direction: 'up' | 'down') => void
  onDraftOrderDrop: (draggedId: string, targetId: string) => void
  onResetDraft: () => void
}

export function LeagueDraftSettings({
  settings, setSettings, isCommissioner, isDraftStarted, saving, onSave,
  draftOrderTeams, draggedTeamId, setDraggedTeamId, onMoveDraftOrder, onDraftOrderDrop, onResetDraft,
}: LeagueDraftSettingsProps) {
  return (
    <div className="space-y-6">
      <section className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Draft Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary mb-2">Draft Date & Time <span className="text-text-muted text-xs">(optional — visible to members as a countdown)</span></label>
            <input
              type="datetime-local"
              value={settings.draft_date
                ? new Date(settings.draft_date).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', 'T')
                : ''
              }
              onChange={(e) => setSettings({ ...settings, draft_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              disabled={isDraftStarted}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50 [color-scheme:dark]"
            />
            <p className="text-text-muted text-sm mt-1">When your league will draft. Members see a countdown on the league page. You still start the draft manually from the Draft Room.</p>
            {settings.draft_date && (
              <p className="text-text-muted text-xs mt-1">
                Displays as: {new Date(settings.draft_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
              </p>
            )}
          </div>

          <div>
            <label className="block text-text-secondary mb-2">Draft Type</label>
            <select
              value={settings.draft_type}
              onChange={(e) => setSettings({ ...settings, draft_type: e.target.value as 'snake' | 'linear' })}
              disabled={isDraftStarted}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
            >
              <option value="snake">Snake (order reverses each round)</option>
              <option value="linear">Linear (same order each round)</option>
            </select>
          </div>

          <div>
            <label className="block text-text-secondary mb-2">Draft Order</label>
            <select
              value={settings.draft_order_type}
              onChange={(e) => setSettings({ ...settings, draft_order_type: e.target.value as 'random' | 'manual' })}
              disabled={isDraftStarted}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
            >
              <option value="random">Random (shuffled when draft starts)</option>
              <option value="manual">Manual (set order in draft room)</option>
            </select>
            <p className="text-text-muted text-sm mt-1">
              {settings.draft_order_type === 'manual'
                ? 'Drag teams to set your preferred order below'
                : 'Teams will be randomly ordered when the draft begins'}
            </p>
          </div>

          {/* Manual Draft Order Reordering */}
          {settings.draft_order_type === 'manual' && draftOrderTeams.length > 0 && (
            <div className="bg-surface-inset rounded-lg p-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Draft Order</h3>
              {isCommissioner && !isDraftStarted && (
                <p className="text-text-muted text-xs mb-3">Drag to reorder or use the arrows.</p>
              )}
              <div className="space-y-2">
                {[...draftOrderTeams]
                  .sort((a, b) => a.draft_position - b.draft_position)
                  .map((team, idx) => {
                    const canDrag = isCommissioner && !isDraftStarted
                    return (
                      <div
                        key={team.id}
                        draggable={canDrag}
                        onDragStart={() => canDrag && setDraggedTeamId(team.id)}
                        onDragEnd={() => setDraggedTeamId(null)}
                        onDragOver={(e) => { if (canDrag) e.preventDefault() }}
                        onDrop={() => {
                          if (canDrag && draggedTeamId && draggedTeamId !== team.id) {
                            onDraftOrderDrop(draggedTeamId, team.id)
                            setDraggedTeamId(null)
                          }
                        }}
                        className={`flex items-center gap-3 bg-surface rounded-lg px-4 py-3 transition-all ${
                          canDrag ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${draggedTeamId === team.id ? 'opacity-50 scale-95' : ''} ${
                          draggedTeamId && draggedTeamId !== team.id ? 'border-2 border-dashed border-transparent hover:border-brand/40' : ''
                        }`}
                      >
                        {canDrag && (
                          <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        )}
                        <span className="text-text-muted text-sm font-mono w-6 text-center">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">{team.name}</p>
                          <p className="text-text-muted text-xs truncate">{team.owner_name}</p>
                        </div>
                        {canDrag && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => onMoveDraftOrder(team.id, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Move up"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => onMoveDraftOrder(team.id, 'down')}
                              disabled={idx === draftOrderTeams.length - 1}
                              className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Move down"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
              {isDraftStarted && (
                <p className="text-text-muted text-xs mt-2">Draft order cannot be changed after the draft has started.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-text-secondary mb-2">Pick Timer</label>
            <select
              value={settings.draft_timer_seconds}
              onChange={(e) => setSettings({ ...settings, draft_timer_seconds: parseInt(e.target.value) })}
              disabled={isDraftStarted}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
            >
              <option value="30">30 seconds</option>
              <option value="45">45 seconds</option>
              <option value="60">60 seconds (recommended)</option>
              <option value="90">90 seconds</option>
              <option value="120">120 seconds (2 min)</option>
            </select>
          </div>

          <div>
            <label className="block text-text-secondary mb-2">Max Times a School Can Be Drafted (All Teams)</label>
            <select
              value={settings.max_school_selections_total}
              onChange={(e) => setSettings({ ...settings, max_school_selections_total: parseInt(e.target.value) })}
              disabled={isDraftStarted}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary disabled:opacity-50"
            >
              <option value="1">1 time (exclusive)</option>
              <option value="2">2 times</option>
              <option value="3">3 times (recommended)</option>
              <option value="4">4 times</option>
              <option value="5">5 times</option>
              <option value="0">Unlimited</option>
            </select>
            <p className="text-text-muted text-sm mt-1">How many different teams can draft the same school. 1 = exclusive (once drafted, nobody else can pick that school). 3 = up to 3 teams can share a school.</p>
          </div>

          {isCommissioner && (
            <button
              onClick={onSave}
              disabled={saving || isDraftStarted}
              className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
            >
              {saving ? 'Saving...' : 'Save Draft Settings'}
            </button>
          )}
        </div>
      </section>

      {/* Reset Draft Section */}
      <section className="bg-surface rounded-lg p-6 border border-danger/30">
        <h2 className="text-xl font-semibold text-danger-text mb-4">Danger Zone</h2>
        <p className="text-text-secondary mb-4">
          Reset the draft to start over. This will delete all picks, clear the draft order,
          and remove all schools from team rosters.
        </p>
        <button
          onClick={onResetDraft}
          className="bg-danger hover:bg-danger-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Reset Draft
        </button>
      </section>
    </div>
  )
}
