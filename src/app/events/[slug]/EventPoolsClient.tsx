'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { trackEventActivity } from '@/app/actions/activity'
import { track } from '@vercel/analytics'

interface Pool {
  id: string
  name: string
  created_by: string
  visibility: 'public' | 'private'
  status: string
  tiebreaker: string
  max_entries: number | null
  max_entries_per_user: number
  invite_code: string
  scoring_rules: Record<string, unknown>
  game_type: string | null
  created_at: string
  entry_count: number
  is_member: boolean
}

interface EventPoolsClientProps {
  tournamentId: string
  tournamentSlug: string
  tournamentFormat: string
  allowedGameTypes?: string[]
  pools: Pool[]
  isLoggedIn: boolean
}

const formatLabel: Record<string, string> = {
  bracket: 'Bracket',
  pickem: "Pick'em",
  survivor: 'Survivor',
  roster: 'Roster',
  multi: 'Multi-format',
}

const tiebreakerLabels: Record<string, string> = {
  none: 'None',
  championship_score: 'Championship score',
  first_match_score: 'First match score',
  most_upsets: 'Most upsets',
  random: 'Random',
}

export function EventPoolsClient({
  tournamentId,
  tournamentSlug,
  tournamentFormat,
  allowedGameTypes,
  pools: initialPools,
  isLoggedIn,
}: EventPoolsClientProps) {
  const [pools, setPools] = useState(initialPools)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  const isMultiFormat = tournamentFormat === 'multi' && allowedGameTypes && allowedGameTypes.length > 1

  // Create form state
  const [name, setName] = useState('')
  const [gameType, setGameType] = useState(allowedGameTypes?.[0] || tournamentFormat)
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [tiebreaker, setTiebreaker] = useState('none')
  const [maxEntries, setMaxEntries] = useState('')
  const [maxEntriesPerUser, setMaxEntriesPerUser] = useState('1')

  // Roster draft mode state (only shown when gameType is 'roster')
  const [draftMode, setDraftMode] = useState<'open' | 'limited' | 'snake_draft' | 'linear_draft'>('open')
  const [selectionCap, setSelectionCap] = useState('3')

  // Join form state
  const [inviteCode, setInviteCode] = useState('')

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 2) {
      addToast('Pool name must be at least 2 characters', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/events/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          name: name.trim(),
          visibility,
          tiebreaker,
          maxEntries: maxEntries ? parseInt(maxEntries, 10) : undefined,
          maxEntriesPerUser: parseInt(maxEntriesPerUser, 10) || 1,
          ...(isMultiFormat ? { gameType } : {}),
          ...((isMultiFormat ? gameType : tournamentFormat) === 'roster' ? {
            scoringRules: {
              draft_mode: draftMode,
              ...(draftMode === 'limited' ? { selection_cap: parseInt(selectionCap, 10) || 3 } : {}),
            },
          } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to create pool', 'error')
        return
      }

      addToast(`Pool created! Invite code: ${data.inviteCode}`, 'success')
      const effectiveFormat = isMultiFormat ? gameType : tournamentFormat
      track('event_pool_created', { format: effectiveFormat })
      trackEventActivity('pool.created', data.poolId, tournamentId, { name: name.trim(), format: effectiveFormat })

      // Navigate to the new pool
      router.push(`/events/${tournamentSlug}/pools/${data.poolId}`)
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      addToast('Enter an invite code', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/events/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to join pool', 'error')
        return
      }

      addToast('Joined pool!', 'success')
      track('event_pool_joined', { format: tournamentFormat })
      trackEventActivity('pool.joined', data.poolId, tournamentId)

      setShowJoin(false)
      setInviteCode('')
      router.refresh()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="brand-h3 text-xl text-text-primary">
          Pools
          <span className="text-text-muted font-normal text-sm ml-2">({pools.length})</span>
        </h2>
        {isLoggedIn && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowJoin(!showJoin); setShowCreate(false) }}
              className="text-sm px-3 py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:border-brand/40 transition-colors"
            >
              Join Pool
            </button>
            <button
              onClick={() => { setShowCreate(!showCreate); setShowJoin(false) }}
              className="text-sm px-3 py-1.5 rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors font-medium"
            >
              Create Pool
            </button>
          </div>
        )}
      </div>

      {/* Join Form */}
      {showJoin && (
        <div className="bg-surface rounded-lg border border-border p-4 mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">Join with Invite Code</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter code..."
              maxLength={10}
              className="flex-1 bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 uppercase tracking-wider font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button
              onClick={handleJoin}
              disabled={isSubmitting || !inviteCode.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-surface rounded-lg border border-border p-4 mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">Create a New Pool</h3>
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Pool Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`My ${formatLabel[tournamentFormat] || 'Event'} Pool`}
                maxLength={60}
                className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>

            {/* Game Type (multi-format tournaments only) */}
            {isMultiFormat && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Game Type</label>
                <div className="flex gap-2">
                  {allowedGameTypes!.map((gt) => (
                    <button
                      key={gt}
                      type="button"
                      onClick={() => setGameType(gt)}
                      className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                        gameType === gt
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {formatLabel[gt] || gt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Draft Mode (roster only) */}
            {((isMultiFormat ? gameType : tournamentFormat) === 'roster') && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Draft Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'open', label: 'Open Pick', desc: 'Everyone picks independently' },
                    { value: 'limited', label: 'Limited Pick', desc: 'Shared picks with selection cap' },
                    { value: 'snake_draft', label: 'Snake Draft', desc: 'Turn-based, reverses each round' },
                    { value: 'linear_draft', label: 'Linear Draft', desc: 'Turn-based, same order each round' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraftMode(opt.value)}
                      className={`text-left text-xs py-2 px-3 rounded-md border transition-colors ${
                        draftMode === opt.value
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <span className="block font-medium">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Selection cap (limited mode only) */}
                {draftMode === 'limited' && (
                  <div className="mt-2">
                    <label className="block text-[10px] text-text-muted mb-1">Max times a golfer can be picked across all rosters</label>
                    <select
                      value={selectionCap}
                      onChange={(e) => setSelectionCap(e.target.value)}
                      className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                    >
                      {[2, 3, 4, 5, 6, 8, 10].map(n => (
                        <option key={n} value={String(n)}>{n} entries</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Visibility + Tiebreaker row */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                      visibility === 'private'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                      visibility === 'public'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    Public
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1">Tiebreaker</label>
                <select
                  value={tiebreaker}
                  onChange={(e) => setTiebreaker(e.target.value)}
                  className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  {Object.entries(tiebreakerLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Entries */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Max Entries (optional)</label>
              <input
                type="number"
                value={maxEntries}
                onChange={(e) => setMaxEntries(e.target.value)}
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
                value={maxEntriesPerUser}
                onChange={(e) => setMaxEntriesPerUser(e.target.value)}
                className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
              >
                <option value="1">1 (standard)</option>
                <option value="3">Up to 3</option>
                <option value="5">Up to 5</option>
                <option value="10">Up to 10</option>
              </select>
              <p className="text-xs text-text-muted mt-1">How many entries each user can submit</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-sm rounded-md text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not logged in CTA */}
      {!isLoggedIn && (
        <div className="bg-surface rounded-lg border border-border p-6 mb-4 text-center">
          <p className="text-text-secondary mb-3">Sign in to create or join pools</p>
          <Link
            href={`/login?next=/events/${tournamentSlug}`}
            className="inline-block px-4 py-2 text-sm font-medium rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Pool List */}
      {pools.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-8 text-center">
          <p className="text-text-secondary mb-1">No pools yet</p>
          <p className="text-text-muted text-sm">Be the first to create a pool for this event!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pools.map((pool) => (
            <Link
              key={pool.id}
              href={`/events/${tournamentSlug}/pools/${pool.id}`}
              className="block bg-surface rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all p-4"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-text-primary font-medium truncate">{pool.name}</h3>
                    {pool.is_member && (
                      <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-success/20 text-success-text">
                        Joined
                      </span>
                    )}
                    {pool.game_type && isMultiFormat && (
                      <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                        {formatLabel[pool.game_type] || pool.game_type}
                      </span>
                    )}
                    {pool.visibility === 'private' && (
                      <span className="shrink-0 text-xs text-text-muted">
                        <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    <span>{pool.entry_count} entr{pool.entry_count === 1 ? 'y' : 'ies'}</span>
                    {pool.max_entries && (
                      <span>/ {pool.max_entries} max</span>
                    )}
                    {pool.max_entries_per_user > 1 && (
                      <span>{pool.max_entries_per_user} entries/user</span>
                    )}
                    {pool.tiebreaker !== 'none' && (
                      <span>TB: {tiebreakerLabels[pool.tiebreaker] || pool.tiebreaker}</span>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 text-text-muted shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
