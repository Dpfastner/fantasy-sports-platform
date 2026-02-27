'use client'

import { useState } from 'react'
import { UserBadges } from '@/components/UserBadges'
import { grantBadge, revokeBadge, uploadBadgeIcon } from '@/app/actions/admin'
import type { BadgeDefinition, UserBadgeWithDefinition } from '@/types/database'

interface Commissioner {
  userId: string
  email: string
  displayName: string | null
  leagueCount: number
  totalMembers: number
  draftsCompleted: number
  meetsThreshold: boolean
  badges: UserBadgeWithDefinition[]
}

interface BadgeAdminTableProps {
  commissioners: Commissioner[]
  badgeDefinitions: BadgeDefinition[]
}

export function BadgeAdminTable({ commissioners, badgeDefinitions }: BadgeAdminTableProps) {
  const [userBadges, setUserBadges] = useState<Record<string, UserBadgeWithDefinition[]>>(
    Object.fromEntries(commissioners.map(c => [c.userId, c.badges]))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Grant badge modal state
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null)
  const [selectedBadgeSlug, setSelectedBadgeSlug] = useState('')
  const [badgeMetadata, setBadgeMetadata] = useState({ sport: '', year: '', league_name: '' })

  // Icon upload state
  const [uploadingBadgeId, setUploadingBadgeId] = useState<string | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleGrant = async (userId: string, badgeSlug: string, metadata?: Record<string, unknown>) => {
    setLoading(userId)
    setMessage(null)
    const result = await grantBadge(userId, badgeSlug, metadata)
    if (result.error) {
      showMessage('error', result.error)
    } else {
      showMessage('success', `Badge "${badgeSlug}" granted`)
      // Optimistically add badge to local state
      const def = badgeDefinitions.find(d => d.slug === badgeSlug)
      if (def) {
        const newBadge: UserBadgeWithDefinition = {
          id: crypto.randomUUID(),
          user_id: userId,
          badge_definition_id: def.id,
          metadata: metadata || {},
          granted_at: new Date().toISOString(),
          badge_definitions: def,
        }
        setUserBadges(prev => ({
          ...prev,
          [userId]: [...(prev[userId] || []), newBadge],
        }))
      }
    }
    setLoading(null)
    setGrantingUserId(null)
    setSelectedBadgeSlug('')
    setBadgeMetadata({ sport: '', year: '', league_name: '' })
  }

  const handleRevoke = async (userId: string, userBadgeId: string) => {
    setLoading(userId)
    setMessage(null)
    const result = await revokeBadge(userBadgeId)
    if (result.error) {
      showMessage('error', result.error)
    } else {
      showMessage('success', 'Badge revoked')
      setUserBadges(prev => ({
        ...prev,
        [userId]: (prev[userId] || []).filter(b => b.id !== userBadgeId),
      }))
    }
    setLoading(null)
  }

  const handleIconUpload = async (badgeDefId: string, file: File) => {
    setUploadingBadgeId(badgeDefId)
    const formData = new FormData()
    formData.append('icon', file)
    const result = await uploadBadgeIcon(badgeDefId, formData)
    if (result.error) {
      showMessage('error', result.error)
    } else {
      showMessage('success', 'Icon uploaded')
    }
    setUploadingBadgeId(null)
  }

  const selectedBadgeDef = badgeDefinitions.find(d => d.slug === selectedBadgeSlug)

  if (commissioners.length === 0) {
    return <p className="text-text-secondary">No commissioners found. Leagues need to be created first.</p>
  }

  return (
    <>
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-success/10 border border-success text-success-text'
            : 'bg-danger/10 border border-danger text-danger-text'
        }`}>
          {message.text}
        </div>
      )}

      {/* Icon Upload Section */}
      <div className="mb-6 p-4 bg-surface-subtle rounded-lg">
        <h3 className="text-sm font-medium text-text-primary mb-2">Upload Badge Icons</h3>
        <div className="flex flex-wrap gap-3">
          {badgeDefinitions.map(def => (
            <label key={def.id} className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleIconUpload(def.id, file)
                  e.target.value = ''
                }}
              />
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-inset transition-colors ${
                uploadingBadgeId === def.id ? 'opacity-50' : ''
              }`}>
                {uploadingBadgeId === def.id ? 'Uploading...' : `Upload ${def.label} icon`}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Grant Badge Modal */}
      {grantingUserId && (
        <div className="mb-4 p-4 bg-surface-subtle rounded-lg border border-border">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Grant Badge to {commissioners.find(c => c.userId === grantingUserId)?.displayName || 'User'}
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Badge Type</label>
              <select
                value={selectedBadgeSlug}
                onChange={(e) => setSelectedBadgeSlug(e.target.value)}
                className="px-3 py-1.5 bg-surface border border-border rounded text-text-primary text-sm"
              >
                <option value="">Select badge...</option>
                {badgeDefinitions.map(def => (
                  <option key={def.slug} value={def.slug}>{def.label}</option>
                ))}
              </select>
            </div>

            {selectedBadgeDef?.requires_metadata && (
              <>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Sport</label>
                  <select
                    value={badgeMetadata.sport}
                    onChange={(e) => setBadgeMetadata(prev => ({ ...prev, sport: e.target.value }))}
                    className="px-3 py-1.5 bg-surface border border-border rounded text-text-primary text-sm"
                  >
                    <option value="">Select sport...</option>
                    <option value="college_football">College Football</option>
                    <option value="hockey">Hockey</option>
                    <option value="baseball">Baseball</option>
                    <option value="basketball">Basketball</option>
                    <option value="cricket">Cricket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Year</label>
                  <input
                    type="number"
                    value={badgeMetadata.year}
                    onChange={(e) => setBadgeMetadata(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="2025"
                    className="px-3 py-1.5 bg-surface border border-border rounded text-text-primary text-sm w-24"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">League Name</label>
                  <input
                    type="text"
                    value={badgeMetadata.league_name}
                    onChange={(e) => setBadgeMetadata(prev => ({ ...prev, league_name: e.target.value }))}
                    placeholder="League name"
                    className="px-3 py-1.5 bg-surface border border-border rounded text-text-primary text-sm"
                  />
                </div>
              </>
            )}

            <button
              onClick={() => {
                if (!selectedBadgeSlug) return
                const metadata = selectedBadgeDef?.requires_metadata
                  ? { sport: badgeMetadata.sport, year: parseInt(badgeMetadata.year), league_name: badgeMetadata.league_name }
                  : undefined
                handleGrant(grantingUserId, selectedBadgeSlug, metadata)
              }}
              disabled={!selectedBadgeSlug || loading === grantingUserId}
              className="px-3 py-1.5 text-sm rounded bg-accent/20 hover:bg-accent/30 text-accent transition-colors disabled:opacity-50"
            >
              {loading === grantingUserId ? 'Granting...' : 'Grant'}
            </button>
            <button
              onClick={() => {
                setGrantingUserId(null)
                setSelectedBadgeSlug('')
                setBadgeMetadata({ sport: '', year: '', league_name: '' })
              }}
              className="px-3 py-1.5 text-sm rounded bg-surface hover:bg-surface-inset text-text-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
              <th className="px-4 py-3 font-medium">Commissioner</th>
              <th className="px-4 py-3 font-medium">Badges</th>
              <th className="px-4 py-3 font-medium text-right">Leagues</th>
              <th className="px-4 py-3 font-medium text-right">Members</th>
              <th className="px-4 py-3 font-medium text-right">Drafts Done</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commissioners.map((c) => {
              const badges = userBadges[c.userId] || []
              const isLoading = loading === c.userId

              return (
                <tr key={c.userId} className="border-b border-border-subtle">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-text-primary font-medium">
                        {c.displayName || 'Unknown'}
                      </span>
                      {c.meetsThreshold && badges.length === 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-success/20 text-success-text">
                          Qualifies
                        </span>
                      )}
                      <div className="text-text-muted text-xs mt-0.5">{c.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {badges.length > 0 ? (
                        <>
                          <UserBadges badges={badges} size="sm" />
                          {badges.map(b => (
                            <button
                              key={b.id}
                              onClick={() => handleRevoke(c.userId, b.id)}
                              disabled={isLoading}
                              className="px-1.5 py-0.5 text-xs rounded bg-danger/10 hover:bg-danger/20 text-danger-text transition-colors disabled:opacity-50"
                              title={`Revoke ${b.badge_definitions.label}`}
                            >
                              x
                            </button>
                          ))}
                        </>
                      ) : (
                        <span className="text-text-muted text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium text-right">{c.leagueCount}</td>
                  <td className="px-4 py-3 text-text-primary font-medium text-right">{c.totalMembers}</td>
                  <td className="px-4 py-3 text-text-primary font-medium text-right">{c.draftsCompleted}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setGrantingUserId(c.userId)}
                      disabled={isLoading}
                      className="px-3 py-1 text-sm rounded bg-accent/20 hover:bg-accent/30 text-accent transition-colors disabled:opacity-50"
                    >
                      Grant Badge
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
