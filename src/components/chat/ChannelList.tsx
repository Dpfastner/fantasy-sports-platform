'use client'

import { useState, useEffect } from 'react'
import { useChatContext, Channel } from '@/contexts/ChatContext'

const TYPE_ICONS: Record<Channel['type'], string> = {
  league: '🏈',
  pool: '🏆',
  dm: '💬',
}

// Two display groups: Competitions (leagues + pools) and Direct Messages
const SECTIONS = [
  { key: 'competitions', label: 'Competitions', types: ['league', 'pool'] as Channel['type'][] },
  { key: 'dm', label: 'Direct Messages', types: ['dm'] as Channel['type'][] },
]

interface MemberOption {
  id: string
  display_name: string
}

export function ChannelList({ autoOpenDmPicker }: { autoOpenDmPicker?: boolean } = {}) {
  const ctx = useChatContext()
  const [showNewDm, setShowNewDm] = useState(!!autoOpenDmPicker)
  const [dmSearch, setDmSearch] = useState('')
  const [dmMembers, setDmMembers] = useState<MemberOption[]>([])
  const [dmLoading, setDmLoading] = useState(false)
  const [dmCreating, setDmCreating] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)

  if (!ctx) return null

  const { channels, activeChannel, setActiveChannel, unreadCounts, userId, refreshChannels, blockedIds } = ctx

  // Group channels by section, filtering out DMs where the other user is blocked
  const getChannelsForSection = (types: Channel['type'][]) =>
    channels.filter(ch => {
      if (!types.includes(ch.type)) return false
      // Hide DM channels where the partner is blocked
      if (ch.type === 'dm' && ch.partnerId && blockedIds.has(ch.partnerId)) return false
      return true
    })

  // Fetch league members when DM picker opens
  const openNewDm = async () => {
    setShowNewDm(true)
    setDmSearch('')
    setDmLoading(true)

    try {
      // Get members from all leagues and pools the user is in
      const leagueChannels = channels.filter(ch => ch.type === 'league')
      const poolChannels = channels.filter(ch => ch.type === 'pool')
      const allMembers = new Map<string, MemberOption>()

      await Promise.all([
        // Fetch league members
        ...leagueChannels.map(async (ch) => {
          try {
            const res = await fetch(`/api/leagues/${ch.entityId}/members`)
            if (res.ok) {
              const data = await res.json()
              for (const m of (data.members || [])) {
                if (m.id !== userId) {
                  allMembers.set(m.id, m)
                }
              }
            }
          } catch { /* skip */ }
        }),
        // Fetch pool members
        ...poolChannels.map(async (ch) => {
          try {
            const res = await fetch(`/api/events/pools/${ch.entityId}/members`)
            if (res.ok) {
              const data = await res.json()
              for (const m of (data.members || [])) {
                if (m.id !== userId) {
                  allMembers.set(m.id, m)
                }
              }
            }
          } catch { /* skip */ }
        }),
      ])

      setDmMembers(Array.from(allMembers.values()).sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      ))
    } catch { /* skip */ }
    setDmLoading(false)
  }

  const startDm = async (member: MemberOption) => {
    setDmCreating(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await refreshChannels()

      // Navigate to the new/existing DM channel
      setActiveChannel({
        id: `dm:${data.conversationId}`,
        type: 'dm',
        name: member.display_name,
        entityId: data.conversationId,
      })
      setShowNewDm(false)
    } catch { /* skip */ }
    setDmCreating(false)
  }

  // Auto-open DM picker when triggered from dropdown's "+ New Message"
  useEffect(() => {
    if (autoOpenDmPicker && !autoTriggered) {
      setAutoTriggered(true)
      openNewDm()
    }
  }, [autoOpenDmPicker, autoTriggered])

  const filteredDmMembers = dmSearch
    ? dmMembers.filter(m => m.display_name.toLowerCase().includes(dmSearch.toLowerCase()))
    : dmMembers

  return (
    <div className="flex-1 overflow-y-auto">
      {SECTIONS.map(({ key, label, types }) => {
        const items = getChannelsForSection(types)
        const isDm = key === 'dm'
        // Always show DM section (even if empty) so the + button is accessible
        if (!isDm && items.length === 0) return null
        return (
          <div key={key}>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {label}
              </span>
              {isDm && (
                <button
                  onClick={() => showNewDm ? setShowNewDm(false) : openNewDm()}
                  className="p-0.5 text-text-muted hover:text-text-primary transition-colors"
                  title="New message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {/* New DM picker */}
            {isDm && showNewDm && (
              <div className="mx-2 mb-2 border border-border rounded-lg bg-surface-inset overflow-hidden">
                <input
                  type="text"
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                  placeholder="Search members..."
                  autoFocus
                  className="w-full px-3 py-2 bg-transparent text-text-primary text-sm placeholder:text-text-muted border-b border-border outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {dmLoading ? (
                    <div className="px-3 py-3 text-center text-text-muted text-xs">Loading...</div>
                  ) : filteredDmMembers.length === 0 ? (
                    <div className="px-3 py-3 text-center text-text-muted text-xs">
                      {dmSearch ? 'No members found' : 'No members available'}
                    </div>
                  ) : (
                    filteredDmMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => startDm(m)}
                        disabled={dmCreating}
                        className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        {m.display_name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {items.map(ch => {
              const isActive = activeChannel?.id === ch.id
              const unread = unreadCounts[ch.id] || 0
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-brand/15 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                  }`}
                >
                  <span className="text-xs">{TYPE_ICONS[ch.type]}</span>
                  <span className="flex-1 truncate">{ch.name}</span>
                  {unread > 0 && (
                    <span className="bg-brand text-text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}

      {channels.length === 0 && !showNewDm && (
        <div className="px-3 py-6 text-center text-text-muted text-xs">
          Join a league or pool to start chatting
        </div>
      )}
    </div>
  )
}
