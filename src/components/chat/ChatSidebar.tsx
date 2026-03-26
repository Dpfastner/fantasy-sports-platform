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
  const [pendingDmPicker, setPendingDmPicker] = useState(false)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const sendRef = useRef<((msg: ChatMessage) => void) | null>(null)

  // Delay render until after first paint so sidebar doesn't flash before page content
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Measure footer height so sidebar stops above it (only when footer is visible)
  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return

    let footerHeight = footer.offsetHeight
    let footerVisible = false

    const sync = () => {
      document.documentElement.style.setProperty(
        '--footer-h',
        footerVisible ? `${footerHeight}px` : '0px'
      )
    }

    const ro = new ResizeObserver(() => {
      footerHeight = footer.offsetHeight
      sync()
    })
    ro.observe(footer)

    const io = new IntersectionObserver(
      ([entry]) => {
        footerVisible = entry.isIntersecting
        sync()
      },
      { threshold: 0 }
    )
    io.observe(footer)

    return () => { ro.disconnect(); io.disconnect() }
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

  // Close dropdown on outside click (checks both dropdown and trigger)
  useEffect(() => {
    if (!showChannelDropdown) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setShowChannelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showChannelDropdown])

  // Auto-select channel based on current page
  useEffect(() => {
    if (!ctx || ctx.channels.length === 0 || !pathname) return

    // Match /leagues/[id]...
    const leagueMatch = pathname.match(/^\/leagues\/([^/]+)/)
    if (leagueMatch) {
      const leagueId = leagueMatch[1]
      // Only auto-select if not already viewing this league's chat
      if (ctx.activeChannel?.type === 'league' && ctx.activeChannel?.entityId === leagueId) return
      const ch = ctx.channels.find(c => c.type === 'league' && c.entityId === leagueId)
      if (ch) ctx.setActiveChannel(ch)
      return
    }

    // Match /events/.../pools/[poolId]...
    const poolMatch = pathname.match(/\/pools\/([^/]+)/)
    if (poolMatch) {
      const poolId = poolMatch[1]
      if (ctx.activeChannel?.type === 'pool' && ctx.activeChannel?.entityId === poolId) return
      const ch = ctx.channels.find(c => c.type === 'pool' && c.entityId === poolId)
      if (ch) ctx.setActiveChannel(ch)
      return
    }
  }, [pathname, ctx?.channels.length])

  if (!ctx || !mounted) return null

  const { isOpen, setIsOpen, activeChannel, setActiveChannel, channels, userId, unreadCounts } = ctx

  // Hide entirely for unauthenticated users and on draft pages (draft has its own chat)
  if (!userId || pathname?.includes('/draft')) return null

  const hasUnread = Object.values(unreadCounts).some((c) => c > 0)

  const handleChannelSwitch = (ch: Channel) => {
    setActiveChannel(ch)
    setShowChannelDropdown(false)
    setPendingDmPicker(false)
    setShowPinnedOnly(false)
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
            <div className="flex items-center gap-2 min-w-0">
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
                ref={triggerRef}
                onClick={() => {
                  if (showChannelDropdown) {
                    setShowChannelDropdown(false)
                  } else {
                    const rect = triggerRef.current?.getBoundingClientRect()
                    if (rect) setDropdownPos({ top: rect.bottom + 4, left: rect.left })
                    setShowChannelDropdown(true)
                  }
                }}
                className="flex items-center gap-1 min-w-0 hover:text-brand-text transition-colors"
              >
                <span className="text-sm font-semibold text-text-primary truncate">{activeChannel.name}</span>
                <svg className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${showChannelDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-sm font-semibold text-text-primary">Chat</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {/* Pin filter icon */}
            {activeChannel && (
              <button
                onClick={() => setShowPinnedOnly(p => !p)}
                className={`w-8 h-8 p-1.5 rounded hover:bg-surface-subtle transition-colors ${showPinnedOnly ? 'text-warning-text' : 'text-text-muted'}`}
                title={showPinnedOnly ? 'Show all messages' : 'Show pinned only'}
              >
                <svg className="w-full h-full" viewBox="0 0 24 24" fill={showPinnedOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8a1 1 0 00-1 1v3.586a1 1 0 01-.293.707l-2.414 2.414a1 1 0 00-.293.707V13a1 1 0 001 1h5v7l1 1 1-1v-7h5a1 1 0 001-1v-1.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0117 7.586V4a1 1 0 00-1-1z" />
                </svg>
              </button>
            )}
            {/* DM shortcut icon */}
            {activeChannel && (
              <button
                onClick={() => {
                  setShowChannelDropdown(false)
                  setPendingDmPicker(true)
                  setActiveChannel(null)
                }}
                className={`h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  pendingDmPicker
                    ? 'bg-brand text-white'
                    : 'bg-surface-subtle text-text-muted hover:text-text-primary'
                }`}
                title="Direct Messages"
              >
                DM
              </button>
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
        </div>

        {/* Body */}
        {activeChannel && userId ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatMessages
              channelType={activeChannel.type}
              channelEntityId={activeChannel.entityId}
              currentUserId={userId}
              isCommissioner={activeChannel.isAdmin}
              onSendRef={sendRef}
              showPinnedOnly={showPinnedOnly}
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
          <ChannelList autoOpenDmPicker={pendingDmPicker} />
        )}
      </aside>

      {/* Channel dropdown — rendered OUTSIDE the aside so transform doesn't trap it */}
      {showChannelDropdown && dropdownPos && isOpen && (
        <div
          ref={dropdownRef}
          className="fixed w-[280px] bg-surface border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {([
            { label: 'Competitions', types: ['league', 'pool'] as Channel['type'][], alwaysShow: false },
            { label: 'Direct Messages', types: ['dm'] as Channel['type'][], alwaysShow: true },
          ]).map(({ label, types, alwaysShow }) => {
            const items = channels.filter(ch => types.includes(ch.type))
            if (!alwaysShow && items.length === 0) return null
            return (
              <div key={label}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {label}
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
                {alwaysShow && (
                  <button
                    onClick={() => {
                      setShowChannelDropdown(false)
                      setPendingDmPicker(true)
                      setActiveChannel(null) // go to channel list with DM picker auto-opened
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Message</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
