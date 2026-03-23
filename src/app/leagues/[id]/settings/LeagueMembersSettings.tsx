'use client'

import { useState } from 'react'
import { UserBadges } from '@/components/UserBadges'
import type { UserTier, UserBadgeWithDefinition } from '@/types/database'
import type { LeagueMember } from './types'

interface LeagueMembersSettingsProps {
  members: LeagueMember[]
  memberBadges: Map<string, UserBadgeWithDefinition[]>
  isCommissioner: boolean
  onTogglePaid: (memberId: string, currentPaid: boolean) => void
  onRemoveMember: (memberId: string, memberName: string) => void
  onChangeRole: (memberId: string, userId: string, newRole: 'commissioner' | 'co_commissioner' | 'member') => void
  onAddSecondOwner: (teamId: string, email: string) => void
  onRemoveSecondOwner: (teamId: string) => void
}

export function LeagueMembersSettings({
  members, memberBadges, isCommissioner,
  onTogglePaid, onRemoveMember, onChangeRole, onAddSecondOwner, onRemoveSecondOwner,
}: LeagueMembersSettingsProps) {
  const [editingSecondOwner, setEditingSecondOwner] = useState<string | null>(null)
  const [secondOwnerEmail, setSecondOwnerEmail] = useState('')

  return (
    <div className="space-y-6">
      <section className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">League Members</h2>

        {members.length === 0 ? (
          <p className="text-text-secondary">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-text-secondary border-b border-border">
                  <th className="pb-4 pr-4 font-medium">Team</th>
                  <th className="pb-4 pr-4 font-medium">Name</th>
                  <th className="pb-4 pr-4 font-medium">Email</th>
                  <th className="pb-4 pr-4 font-medium">Second Owner</th>
                  <th className="pb-4 pr-4 font-medium">Role</th>
                  {isCommissioner && <th className="pb-4 pr-4 font-medium">Paid</th>}
                  {isCommissioner && <th className="pb-4 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {members.map(member => {
                  const team = member.fantasy_teams?.[0]
                  const isCommissionerMember = member.role === 'commissioner'
                  const secondOwnerProfile = team?.second_owner_id
                    ? members.find(m => m.user_id === team.second_owner_id)?.profiles
                    : null

                  return (
                    <tr key={member.id} className="border-b border-border-subtle">
                      <td className="py-4 pr-4 text-text-primary font-medium">
                        {team?.name || <span className="text-warning">No team</span>}
                      </td>
                      <td className="py-4 pr-4 text-text-primary">
                        <span className="inline-flex items-center gap-2">
                          {member.profiles?.display_name || 'Unknown'}
                          <UserBadges badges={memberBadges.get(member.user_id) || []} tier={member.profiles?.tier as UserTier} size="sm" />
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-text-secondary">
                        {member.profiles?.email || 'N/A'}
                      </td>
                      <td className="py-4 pr-4">
                        {team ? (
                          isCommissioner ? (
                            editingSecondOwner === team.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="email"
                                  value={secondOwnerEmail}
                                  onChange={(e) => setSecondOwnerEmail(e.target.value)}
                                  placeholder="Enter email"
                                  className="px-2 py-1 bg-surface text-text-primary text-sm rounded border border-border w-36"
                                />
                                <button
                                  onClick={() => { onAddSecondOwner(team.id, secondOwnerEmail); setEditingSecondOwner(null); setSecondOwnerEmail('') }}
                                  className="px-2 py-1 bg-success hover:bg-success-hover text-text-primary text-xs rounded"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => { setEditingSecondOwner(null); setSecondOwnerEmail('') }}
                                  className="px-2 py-1 bg-surface-subtle hover:bg-surface-subtle text-text-primary text-xs rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : team.second_owner_id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-text-primary text-sm">
                                  {secondOwnerProfile?.display_name || secondOwnerProfile?.email || 'Unknown'}
                                </span>
                                <button
                                  onClick={() => onRemoveSecondOwner(team.id)}
                                  className="px-2 py-1 bg-danger/50 hover:bg-danger text-text-primary text-xs rounded"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingSecondOwner(team.id)}
                                className="px-3 py-1 bg-brand hover:bg-brand-hover text-text-primary text-xs rounded"
                              >
                                Add Second Owner
                              </button>
                            )
                          ) : team.second_owner_id ? (
                            <span className="text-text-primary text-sm">
                              {secondOwnerProfile?.display_name || secondOwnerProfile?.email || 'Unknown'}
                            </span>
                          ) : (
                            <span className="text-text-muted text-sm">None</span>
                          )
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        {isCommissionerMember ? (
                          <span className="px-3 py-1 rounded text-xs font-medium bg-info/20 text-info-text">
                            Commissioner
                          </span>
                        ) : isCommissioner ? (
                          <select
                            value={member.role}
                            onChange={(e) => {
                              const newRole = e.target.value as 'commissioner' | 'co_commissioner' | 'member'
                              onChangeRole(member.id, member.user_id, newRole)
                            }}
                            className="px-2 py-1 bg-surface text-text-primary text-sm rounded border border-border"
                          >
                            <option value="member">Member</option>
                            <option value="co_commissioner">Co-Commissioner</option>
                            <option value="commissioner">Transfer Commissioner</option>
                          </select>
                        ) : (
                          <span className="px-3 py-1 rounded text-xs font-medium bg-surface-subtle text-text-secondary capitalize">
                            {member.role === 'co_commissioner' ? 'Co-Commissioner' : member.role}
                          </span>
                        )}
                      </td>
                      {isCommissioner && (
                        <td className="py-4 pr-4">
                          <button
                            onClick={() => onTogglePaid(member.id, member.has_paid)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              member.has_paid
                                ? 'bg-success/20 text-success-text hover:bg-success/30'
                                : 'bg-danger/20 text-danger-text hover:bg-danger/30'
                            }`}
                          >
                            {member.has_paid ? 'Paid' : 'Unpaid'}
                          </button>
                        </td>
                      )}
                      {isCommissioner && (
                        <td className="py-4">
                          {!isCommissionerMember && (
                            <button
                              onClick={() => onRemoveMember(member.id, member.profiles?.display_name || 'this member')}
                              className="px-2 py-1 bg-danger hover:bg-danger-hover text-text-primary text-xs rounded transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 p-4 bg-surface-inset rounded-lg">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Total Members:</span>
              <span className="text-text-primary ml-2">{members.length}</span>
            </div>
            <div>
              <span className="text-text-secondary">With Teams:</span>
              <span className="text-text-primary ml-2">{members.filter(m => m.fantasy_teams && m.fantasy_teams.length > 0).length}</span>
            </div>
            <div>
              <span className="text-text-secondary">Paid:</span>
              <span className="text-success-text ml-2">{members.filter(m => m.has_paid).length}</span>
              <span className="text-text-secondary"> / </span>
              <span className="text-danger-text">{members.filter(m => !m.has_paid).length}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
