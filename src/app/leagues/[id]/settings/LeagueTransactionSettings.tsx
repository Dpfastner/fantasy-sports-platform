'use client'

import type { LeagueSettings, RecentTrade } from './types'

type LeagueSubTab = 'basic' | 'roster' | 'scoring' | 'transactions' | 'trades' | 'double_points'

interface LeagueTransactionSettingsProps {
  settings: LeagueSettings
  setSettings: (s: LeagueSettings) => void
  leagueSubTab: LeagueSubTab
  isCommissioner: boolean
  saving: boolean
  onSave: () => void
  // Trade veto
  recentTrades: RecentTrade[]
  vetoingTradeId: string | null
  setVetoingTradeId: (id: string | null) => void
  vetoReason: string
  setVetoReason: (r: string) => void
  vetoSubmitting: boolean
  onVeto: (tradeId: string) => void
}

export function LeagueTransactionSettings({
  settings, setSettings, leagueSubTab, isCommissioner, saving, onSave,
  recentTrades, vetoingTradeId, setVetoingTradeId, vetoReason, setVetoReason, vetoSubmitting, onVeto,
}: LeagueTransactionSettingsProps) {
  if (leagueSubTab === 'transactions') {
    return (
      <section className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Transaction Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary mb-2">Final Add/Drop Deadline <span className="text-text-muted text-xs">(optional)</span></label>
            <input
              type="date"
              value={settings.add_drop_deadline || ''}
              onChange={(e) => setSettings({ ...settings, add_drop_deadline: e.target.value || null })}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary [color-scheme:dark]"
            />
            <p className="text-text-muted text-sm mt-1">Last date teams can make add/drop transactions (usually Monday before Week 7)</p>
          </div>

          <div>
            <label className="block text-text-secondary mb-2">Max Add/Drops per Season</label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.max_add_drops_per_season}
              onChange={(e) => setSettings({ ...settings, max_add_drops_per_season: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
            />
            <p className="text-text-muted text-sm mt-1">Total number of add/drops allowed per team (50 recommended)</p>
          </div>

          {isCommissioner && (
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
            >
              {saving ? 'Saving...' : 'Save Transaction Settings'}
            </button>
          )}
        </div>
      </section>
    )
  }

  if (leagueSubTab === 'trades') {
    return (
      <section className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Trade Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-inset rounded-lg">
            <div>
              <label className="text-text-primary font-medium">Enable Trades</label>
              <p className="text-text-secondary text-sm mt-1">Allow teams to propose and accept trades with each other</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, trades_enabled: !settings.trades_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.trades_enabled ? 'bg-brand' : 'bg-surface-subtle'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition-transform ${
                  settings.trades_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.trades_enabled && (
            <>
              <div>
                <label className="block text-text-secondary mb-2">Trade Deadline <span className="text-text-muted text-xs">(optional)</span></label>
                <input
                  type="date"
                  value={settings.trade_deadline || ''}
                  onChange={(e) => setSettings({ ...settings, trade_deadline: e.target.value || null })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary [color-scheme:dark]"
                />
                <p className="text-text-muted text-sm mt-1">After this date, no new trades can be proposed or accepted. Pending trades will expire. Leave blank for no deadline.</p>
              </div>

              <div>
                <label className="block text-text-secondary mb-2">Max Trades per Season</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.max_trades_per_season}
                  onChange={(e) => setSettings({ ...settings, max_trades_per_season: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
                />
                <p className="text-text-muted text-sm mt-1">Maximum number of completed trades allowed per team per season (10 recommended)</p>
              </div>
            </>
          )}

          {isCommissioner && (
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
            >
              {saving ? 'Saving...' : 'Save Trade Settings'}
            </button>
          )}
        </div>

        {/* Commissioner Trade Veto Section */}
        {recentTrades.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Trades</h3>
            <p className="text-text-muted text-sm mb-4">Veto accepted trades to reverse roster changes. Both teams will be notified.</p>
            <div className="space-y-3">
              {recentTrades.map(trade => {
                const proposer = trade.proposer_team?.name || 'Unknown'
                const receiver = trade.receiver_team?.name || 'Unknown'
                const isVetoed = trade.status === 'vetoed'
                const proposerGiving = trade.trade_items
                  .filter(i => i.team_id === trade.proposer_team?.id && i.direction === 'giving')
                  .map(i => i.schools?.name || 'Unknown')
                const receiverGiving = trade.trade_items
                  .filter(i => i.team_id === trade.receiver_team?.id && i.direction === 'giving')
                  .map(i => i.schools?.name || 'Unknown')

                return (
                  <div key={trade.id} className={`p-4 rounded-lg border ${isVetoed ? 'bg-danger/5 border-danger/20' : 'bg-surface-inset border-border'}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm">
                        <span className="font-medium text-text-primary">{proposer}</span>
                        <span className="text-text-muted"> traded </span>
                        <span className="text-danger-text">{proposerGiving.join(', ')}</span>
                        <span className="text-text-muted"> for </span>
                        <span className="text-success-text">{receiverGiving.join(', ')}</span>
                        <span className="text-text-muted"> from </span>
                        <span className="font-medium text-text-primary">{receiver}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isVetoed ? (
                          <span className="text-xs px-2 py-1 bg-danger/20 text-danger-text rounded-full font-medium">Vetoed</span>
                        ) : (
                          <button
                            onClick={() => { setVetoingTradeId(trade.id); setVetoReason('') }}
                            className="px-3 py-1.5 bg-danger hover:bg-danger/80 text-white rounded text-xs font-medium transition-colors"
                          >
                            Veto
                          </button>
                        )}
                      </div>
                    </div>
                    {trade.resolved_at && (
                      <p className="text-[10px] text-text-muted mt-1">
                        {new Date(trade.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                    {/* Veto reason input */}
                    {vetoingTradeId === trade.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="block text-text-secondary text-sm mb-1">Reason for veto</label>
                        <input
                          type="text"
                          value={vetoReason}
                          onChange={(e) => setVetoReason(e.target.value)}
                          placeholder="e.g. Unfair trade, collusion suspected"
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setVetoingTradeId(null)}
                            className="px-3 py-1.5 bg-surface hover:bg-surface-subtle text-text-primary border border-border rounded text-xs font-medium transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => onVeto(trade.id)}
                            disabled={vetoSubmitting || !vetoReason.trim()}
                            className="px-3 py-1.5 bg-danger hover:bg-danger/80 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors"
                          >
                            {vetoSubmitting ? 'Vetoing...' : 'Confirm Veto'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    )
  }

  // Double Points
  if (leagueSubTab === 'double_points') {
    return (
      <section className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Double Points Pick</h2>
        <p className="text-text-secondary mb-6">
          Allow team owners to pick one school per week to receive double points.
          The pick must be made before the first game of the week.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
            <div>
              <label className="text-text-primary font-medium">Enable Double Points</label>
              <p className="text-text-secondary text-sm mt-1">Allow teams to pick one school per week for 2x points</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, double_points_enabled: !settings.double_points_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.double_points_enabled ? 'bg-brand' : 'bg-surface-subtle'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition-transform ${
                  settings.double_points_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.double_points_enabled && (
            <div>
              <label className="block text-text-secondary mb-2">Max Double Picks per Season</label>
              <select
                value={settings.max_double_picks_per_season}
                onChange={(e) => setSettings({ ...settings, max_double_picks_per_season: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary"
              >
                <option value="0">Unlimited</option>
                {[3, 5, 8, 10, 12, 15].map(n => (
                  <option key={n} value={n}>{n} picks</option>
                ))}
              </select>
              <p className="text-text-muted text-sm mt-1">0 = unlimited double picks throughout the season</p>
            </div>
          )}

          {isCommissioner && (
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
            >
              {saving ? 'Saving...' : 'Save Double Points Settings'}
            </button>
          )}
        </div>
      </section>
    )
  }

  return null
}
