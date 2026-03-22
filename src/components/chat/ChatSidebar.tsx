'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useChatContext, Channel } from '@/contexts/ChatContext'
import { ChannelList } from './ChannelList'
import { ChatMessages, ChatMessage } from './ChatMessages'
import { ChatInput } from './ChatInput'

const TYPE_ICONS: Record<Channel['type'], string> = {
  league: '🏈',
  pool: '🏆',
  dm: '💬',
}

export function ChatSidebar() {
  const ctx = useChatContext()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [displayName, setDisplayName] = useState<string>('You')
  const [showChannelDropdown, setShowChannelDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sendRef = useRef<((msg: ChatMessage) => void) | null>(null)

  // Delay render until after first paint so sidebar doesn't flash before page content
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Measure footer height so sidebar stops above it
  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return
    const update = () => {
      document.documentElement.style.setProperty('--footer-h', `${footer.offsetHeight}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(footer)
    return () => ro.disconnect()
  }, [mounted])

  // Fetch current user's display name for optimistic messages
  useEffect(() => {
    if (!ctx?.userId) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', ctx.userId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data) setDisplayName(data.display_name || data.email?.split('@')[0] || 'You')
      })
  }, [ctx?.userId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showChannelDropdown) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowChannelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showChannelDropdown])

  if (!ctx || !mounted) return null

  const { isOpen, setIsOpen, activeChannel, setActiveChannel, channels, userId, unreadCounts } = ctx

  // Hide entirely for unauthenticated users and on draft pages (draft has its own chat)
  if (!userId || pathname?.includes('/draft')) return null

  const hasUnread = Object.values(unreadCounts).some((c) => c > 0)

  const handleChannelSwitch = (ch: Channel) => {
    setActiveChannel(ch)
    setShowChannelDropdown(false)
  }

  return (
    <>
      {/* Reopen tab — visible only when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30
                     w-8 h-16 bg-surface border border-r-0 border-border
                     rounded-l-lg items-center justify-center
                     text-text-muted hover:text-text-primary hover:bg-surface-subtle
                     transition-colors shadow-md"
          title="Open chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {hasUnread && (
            <span className="absolute -top-1 -left-1 w-3 h-3 bg-brand rounded-full" />
          )}
        </button>
      )}

      {/* Sidebar — always rendered, slides via translate */}
      <aside
        className={`hidden md:flex w-[320px] fixed right-0 top-[var(--header-h)] bottom-[var(--footer-h,0px)]
          border-l border-border bg-surface flex-col z-30 overflow-hidden
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-[11px] border-b border-border flex items-center justify-between shrink-0">
          {activeChannel ? (
            <div className="flex items-center gap-2 min-w-0 relative" ref={dropdownRef}>
              <button
                onClick={() => setActiveChannel(null)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
                title="Back to channels"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Channel name as dropdown trigger */}
              <button
                onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                className="flex items-center gap-1 min-w-0 hover:text-brand-text transition-colors"
              >
                <span className="text-sm font-semibold text-text-primary truncate">{activeChannel.name}</span>
                <svg className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${showChannelDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Channel dropdown */}
              {showChannelDropdown && (
                <div className="absolute left-0 top-full mt-1 w-[280px] bg-surface border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                  {(['league', 'pool', 'dm'] as Channel['type'][]).map(type => {
                    const items = channels.filter(ch => ch.type === type)
                    if (items.length === 0) return null
                    return (
                      <div key={type}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          {type === 'league' ? 'Leagues' : type === 'pool' ? 'Pools' : 'Direct Messages'}
                        </div>
                        {items.map(ch => {
                          const isActive = activeChannel?.id === ch.id
                          const unread = unreadCounts[ch.id] || 0
                          return (
                            <button
                              key={ch.id}
                              onClick={() => handleChannelSwitch(ch)}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
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
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-text-primary">Chat</span>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
            title="Close chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {activeChannel && userId ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatMessages
              channelType={activeChannel.type}
              channelEntityId={activeChannel.entityId}
              currentUserId={userId}
              onSendRef={sendRef}
            />
            <ChatInput
              channelType={activeChannel.type}
              channelEntityId={activeChannel.entityId}
              currentUserId={userId}
              currentDisplayName={displayName}
              onMessageSent={(msg) => sendRef.current?.(msg)}
            />
          </div>
        ) : (
          <ChannelList />
        )}
      </aside>
    </>
  )
}
