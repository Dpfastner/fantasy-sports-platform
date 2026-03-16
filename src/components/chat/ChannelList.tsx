'use client'

import { useChatContext, Channel } from '@/contexts/ChatContext'

const TYPE_LABELS: Record<Channel['type'], string> = {
  league: 'Leagues',
  pool: 'Pools',
  dm: 'Direct Messages',
}

const TYPE_ICONS: Record<Channel['type'], string> = {
  league: '🏈',
  pool: '🏆',
  dm: '💬',
}

export function ChannelList() {
  const ctx = useChatContext()
  if (!ctx) return null

  const { channels, activeChannel, setActiveChannel, unreadCounts } = ctx

  const grouped = channels.reduce<Record<Channel['type'], Channel[]>>((acc, ch) => {
    if (!acc[ch.type]) acc[ch.type] = []
    acc[ch.type].push(ch)
    return acc
  }, {} as Record<Channel['type'], Channel[]>)

  const typeOrder: Channel['type'][] = ['league', 'pool', 'dm']

  return (
    <div className="flex-1 overflow-y-auto">
      {typeOrder.map(type => {
        const items = grouped[type]
        if (!items || items.length === 0) return null
        return (
          <div key={type}>
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {TYPE_LABELS[type]}
            </div>
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
                  <span className="text-xs">{TYPE_ICONS[type]}</span>
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

      {channels.length === 0 && (
        <div className="px-3 py-6 text-center text-text-muted text-xs">
          Join a league or pool to start chatting
        </div>
      )}
    </div>
  )
}
