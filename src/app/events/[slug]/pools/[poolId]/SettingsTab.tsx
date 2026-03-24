'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { ShareButton } from '@/components/ShareButton'

const tiebreakerLabels: Record<string, string> = {
  none: 'None',
  championship_score: 'Championship score',
  first_match_score: 'First match score',
  most_upsets: 'Most upsets',
  random: 'Random',
}

const scoringPresets: Record<string, { label: string; description: string; rules: Record<string, number> }> = {
  standard: {
    label: 'Standard',
    description: 'Balanced scoring across all rounds',
    rules: { regional_quarterfinal: 2, regional_final: 4, semifinal: 8, championship: 16 },
  },
  upset_heavy: {
    label: 'Upset Heavy',
    description: 'Early rounds worth more — rewards bold picks',
    rules: { regional_quarterfinal: 4, regional_final: 5, semifinal: 8, championship: 12 },
  },
  final_four_focus: {
    label: 'Final Four Focus',
    description: 'Late rounds heavily weighted',
    rules: { regional_quarterfinal: 1, regional_final: 2, semifinal: 12, championship: 24 },
  },
}

const roundLabels: Record<string, string> = {
  regional_quarterfinal: 'Quarterfinal',
  regional_final: 'Regional Final',
  semifinal: 'Frozen Four',
  championship: 'Championship',
}

interface SettingsTabProps {
  pool: {
    id: string
    name: string
    inviteCode: string
    visibility: string
    status: string
    tiebreaker: string
    maxEntries: number | null
    scoringRules: Record<string, unknown>
    deadline: string | null
    maxEntriesPerUser: number
    gameType: string | null
  }
  tournament: {
    slug: string
    name: string
    startsAt: string
  }
  effectiveFormat: string
  members: { length: number }
  codeCopied: boolean
  onCopyInviteCode: () => void
  readOnly?: boolean
}

export function SettingsTab({
  pool,
  tournament,
  effectiveFormat,
  members,
  codeCopied,
  onCopyInviteCode,
  readOnly = false,
}: SettingsTabProps) {
  const { addToast } = useToast()
  const router = useRouter()
  const { confirm: confirmDialog } = useConfirm()
  const [isDeleting, setIsDeleting] = useState(false)

  const rosterRules = (pool.scoringRules || {}) as Record<string, unknown>

  // Settings state
  const [settingsName, setSettingsName] = useState(pool.name)
  const [settingsVisibility, setSettingsVisibility] = useState(pool.visibility)
  const [settingsTiebreaker, setSettingsTiebreaker] = useState(pool.tiebreaker)
  const [settingsMaxEntries, setSettingsMaxEntries] = useState(pool.maxEntries?.toString() || '')
  const [settingsMaxEntriesPerUser, setSettingsMaxEntriesPerUser] = useState(pool.maxEntriesPerUser.toString())
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Roster settings
  const [settingsDraftMode, setSettingsDraftMode] = useState<string>(
    (rosterRules.draft_mode as string) || 'open'
  )
  const [settingsSelectionCap, setSettingsSelectionCap] = useState(
    String((rosterRules.selection_cap as number) || 3)
  )
  const [settingsRosterSize, setSettingsRosterSize] = useState(
    String((rosterRules.roster_size as number) || 7)
  )
  const [settingsCountBest, setSettingsCountBest] = useState(
    String((rosterRules.count_best as number) || 5)
  )
  const [settingsCutPenalty, setSettingsCutPenalty] = useState<string>(
    (rosterRules.cut_penalty as string) || 'highest_plus_one'
  )

  // Scoring rules (bracket)
  const defaultScoringRules: Record<string, number> = { regional_quarterfinal: 2, regional_final: 4, semifinal: 8, championship: 16 }
  const initialScoringRules = pool.scoringRules && typeof pool.scoringRules === 'object' && Object.keys(pool.scoringRules).length > 0
    ? pool.scoringRules as Record<string, number>
    : defaultScoringRules
  const [settingsScoringRules, setSettingsScoringRules] = useState<Record<string, number>>({ ...initialScoringRules })
  const activeScoringRules = settingsScoringRules
  const activePreset = Object.entries(scoringPresets).find(
    ([, preset]) => JSON.stringify(preset.rules) === JSON.stringify(activeScoringRules)
  )?.[0] || 'custom'

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const res = await fetch(`/api/events/pools/${pool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName.trim(),
          visibility: settingsVisibility,
          tiebreaker: settingsTiebreaker,
          maxEntries: settingsMaxEntries ? parseInt(settingsMaxEntries, 10) : null,
          maxEntriesPerUser: parseInt(settingsMaxEntriesPerUser, 10) || 1,
          ...(effectiveFormat === 'bracket' ? { scoringRules: settingsScoringRules ?? {} } : {}),
          ...(effectiveFormat === 'roster' ? {
            scoringRules: {
              ...pool.scoringRules,
              draft_mode: settingsDraftMode,
              ...(settingsDraftMode === 'limited' ? { selection_cap: parseInt(settingsSelectionCap, 10) || 3 } : {}),
              roster_size: parseInt(settingsRosterSize, 10) || 7,
              count_best: parseInt(settingsCountBest, 10) || 5,
              cut_penalty: settingsCutPenalty,
            },
          } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Couldn\'t save settings. Try again.', 'error')
        return
      }

      addToast('Settings saved', 'success')
      router.refresh()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="brand-h3 text-base text-text-primary mb-4">Pool Settings</h3>
        <div className="space-y-4">
          {/* Pool Name */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Pool Name</label>
            <input
              type="text"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              maxLength={60}
              className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Visibility</label>
            <div className="flex gap-2">
              {(['private', 'public'] as const).map((vis) => (
                <button
                  key={vis}
                  type="button"
                  onClick={() => setSettingsVisibility(vis)}
                  className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                    settingsVisibility === vis
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {vis.charAt(0).toUpperCase() + vis.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tiebreaker */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Tiebreaker</label>
            <select
              value={settingsTiebreaker}
              onChange={(e) => setSettingsTiebreaker(e.target.value)}
              className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              {Object.entries(tiebreakerLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Max Participants</label>
            <input
              type="number"
              inputMode="numeric"
              value={settingsMaxEntries}
              onChange={(e) => setSettingsMaxEntries(e.target.value)}
              placeholder="Unlimited"
              min={2}
              max={1000}
              className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>

          {/* Entries Per User */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Entries Per User</label>
            <select
              value={settingsMaxEntriesPerUser}
              onChange={(e) => setSettingsMaxEntriesPerUser(e.target.value)}
              className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              <option value="1">1 (standard)</option>
              <option value="3">Up to 3</option>
              <option value="5">Up to 5</option>
              <option value="10">Up to 10</option>
            </select>
            <p className="text-xs text-text-muted mt-1">How many entries each user can submit</p>
          </div>

          {/* Roster Settings */}
          {effectiveFormat === 'roster' && (
            <div className="space-y-4">
              <label className="block text-xs text-text-muted mb-2">Roster Settings</label>

              {/* Draft Mode */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Draft Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'open', label: 'Open Pick', desc: 'Everyone picks independently' },
                    { value: 'limited', label: 'Limited Pick', desc: 'Shared picks with cap' },
                    { value: 'snake_draft', label: 'Snake Draft', desc: 'Reverses each round' },
                    { value: 'linear_draft', label: 'Linear Draft', desc: 'Same order each round' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSettingsDraftMode(opt.value)}
                      className={`text-left text-xs py-2 px-3 rounded-md border transition-colors ${
                        settingsDraftMode === opt.value
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <span className="block font-medium">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selection Cap (limited only) */}
              {settingsDraftMode === 'limited' && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">Selection Cap</label>
                  <select
                    value={settingsSelectionCap}
                    onChange={(e) => setSettingsSelectionCap(e.target.value)}
                    className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {[2, 3, 4, 5, 6, 8, 10].map(n => (
                      <option key={n} value={String(n)}>Max {n} entries per golfer</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Roster Size + Count Best */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Roster Size</label>
                  <select
                    value={settingsRosterSize}
                    onChange={(e) => setSettingsRosterSize(e.target.value)}
                    className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {[5, 6, 7, 8, 10].map(n => (
                      <option key={n} value={String(n)}>{n} golfers</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Count Best</label>
                  <select
                    value={settingsCountBest}
                    onChange={(e) => setSettingsCountBest(e.target.value)}
                    className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {Array.from({ length: parseInt(settingsRosterSize, 10) || 7 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={String(n)}>Best {n} of {settingsRosterSize}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cut Penalty */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Cut Penalty</label>
                <div className="flex gap-2">
                  {([
                    { value: 'highest_plus_one', label: 'Field High +1' },
                    { value: 'none', label: 'No Penalty' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSettingsCutPenalty(opt.value)}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                        settingsCutPenalty === opt.value
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scoring Rules (bracket only) */}
          {effectiveFormat === 'bracket' && (
            <div>
              <label className="block text-xs text-text-muted mb-2">Scoring Rules</label>

              {/* Preset buttons */}
              <div className="flex gap-2 mb-3">
                {Object.entries(scoringPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSettingsScoringRules({ ...preset.rules })}
                    className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                      activePreset === key
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {/* no-op — values stay as-is, user edits below */}}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    activePreset === 'custom'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Custom
                </button>
              </div>

              {activePreset === 'custom' ? (
                <p className="text-xs text-text-muted mb-2">
                  Custom scoring — adjust individual round values below.
                </p>
              ) : activePreset !== 'standard' && (
                <p className="text-xs text-text-muted mb-2">
                  {scoringPresets[activePreset]?.description}
                </p>
              )}

              {/* Per-round point values */}
              <div className="space-y-2 bg-surface-inset rounded-md p-3 border border-border">
                {Object.entries(roundLabels).map(([roundKey, label]) => (
                  <div key={roundKey} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-secondary">{label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        value={activeScoringRules[roundKey] ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0
                          setSettingsScoringRules((prev) => ({
                            ...prev,
                            [roundKey]: Math.max(0, Math.min(100, val)),
                          }))
                        }}
                        className="w-16 bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-brand/50"
                      />
                      <span className="text-xs text-text-muted">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!readOnly && (
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings || !settingsName.trim()}
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </div>
      </div>

      {/* Share / Invite */}
      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="brand-h3 text-base text-text-primary mb-3">Invite Members</h3>
        <p className="text-text-muted text-sm mb-3">
          Share this code or link with friends to invite them to your pool.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-surface-inset border border-border rounded-md px-4 py-2.5 text-center">
            <span className="font-mono text-lg text-text-primary tracking-widest">{pool.inviteCode}</span>
          </div>
          <button
            onClick={onCopyInviteCode}
            className="px-4 py-2.5 text-sm font-medium rounded-md bg-brand hover:bg-brand-hover text-text-primary transition-colors"
          >
            {codeCopied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton
            shareData={{
              title: `Join ${pool.name} on Rivyls`,
              text: `Join my ${effectiveFormat} pool "${pool.name}" for ${tournament.name}! Use code: ${pool.inviteCode}`,
              url: `https://rivyls.com/events/${tournament.slug}/pools/${pool.id}`,
            }}
            ogImageUrl={`https://rivyls.com/api/og/pool?poolId=${pool.id}`}
          />
        </div>
      </div>

      {/* Pool Info */}
      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="brand-h3 text-base text-text-primary mb-3">Pool Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Format</span>
            <span className="text-text-secondary capitalize">{effectiveFormat}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Status</span>
            <span className="text-text-secondary capitalize">{pool.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Members</span>
            <span className="text-text-secondary">{members.length}{pool.maxEntries ? ` / ${pool.maxEntries}` : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Tiebreaker</span>
            <span className="text-text-secondary">{tiebreakerLabels[pool.tiebreaker] || pool.tiebreaker}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Lock Time</span>
            <span className="text-text-secondary">
              {new Date(pool.deadline || tournament.startsAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-8 border border-danger rounded-lg p-4">
          <h3 className="text-danger font-semibold mb-2">Danger Zone</h3>
          <p className="text-text-muted text-sm mb-3">
            Permanently delete this pool and all its entries, picks, and messages. This cannot be undone.
          </p>
          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: 'Delete Pool?',
                message: 'This will permanently delete this pool and all data. This action cannot be undone.',
                confirmLabel: 'Delete',
                variant: 'danger',
              })
              if (!ok) return

              setIsDeleting(true)
              try {
                const res = await fetch(`/api/events/pools/${pool.id}`, { method: 'DELETE' })
                if (res.ok) {
                  addToast('Pool deleted', 'success')
                  router.push('/dashboard')
                } else {
                  const data = await res.json()
                  addToast(data.error || 'Failed to delete pool', 'error')
                }
              } catch {
                addToast('Something went wrong', 'error')
              } finally {
                setIsDeleting(false)
              }
            }}
            disabled={isDeleting}
            className="px-4 py-2 bg-danger hover:bg-danger/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Pool'}
          </button>
        </div>
      )}
    </div>
  )
}
