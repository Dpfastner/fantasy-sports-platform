'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────

export interface Channel {
  id: string
  type: 'league' | 'pool' | 'dm'
  name: string
  imageUrl?: string
  entityId: string // leagueId, poolId, or conversationId
  isAdmin?: boolean // commissioner/co-commissioner for leagues, creator for pools
}

interface ChatContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMobileExpanded: boolean
  setIsMobileExpanded: (expanded: boolean) => void
  activeChannel: Channel | null
  setActiveChannel: (ch: Channel | null) => void
  channels: Channel[]
  unreadCounts: Record<string, number>
  userId: string | null
  refreshChannels: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
  return useContext(ChatContext)
}

// ── Storage key ────────────────────────────────────────────

const SIDEBAR_OPEN_KEY = 'rivyls_chat_open'

// ── Provider ───────────────────────────────────────────────

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpenState] = useState(true)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [userId, setUserId] = useState<string | null>(null)

  // Persist sidebar open state
  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open)
    try { localStorage.setItem(SIDEBAR_OPEN_KEY, open ? '1' : '0') } catch {}
  }, [])

  // Load persisted state + auth
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_KEY)
      if (stored === '0') setIsOpenState(false)
    } catch {}

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
      }
    })
  }, [])

  // Fetch channels when userId is available
  const refreshChannels = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()

    // Fetch leagues (include role for pin permissions)
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, role, leagues(id, name)')
      .eq('user_id', userId)

    const leagueChannels: Channel[] = (memberships || []).map((m: { league_id: string; role: string; leagues: { id: string; name: string } | { id: string; name: string }[] | null }) => {
      const league = Array.isArray(m.leagues) ? m.leagues[0] : m.leagues
      return {
        id: `league:${m.league_id}`,
        type: 'league' as const,
        name: league?.name || 'League',
        entityId: m.league_id,
        isAdmin: m.role === 'commissioner' || m.role === 'co_commissioner',
      }
    })

    // Fetch event pools the user has entries in (include created_by for pin permissions)
    const { data: entries } = await supabase
      .from('event_entries')
      .select('pool_id, event_pools(id, name, created_by)')
      .eq('user_id', userId)

    const poolChannels: Channel[] = (entries || []).map((e: { pool_id: string; event_pools: { id: string; name: string; created_by: string } | { id: string; name: string; created_by: string }[] | null }) => {
      const pool = Array.isArray(e.event_pools) ? e.event_pools[0] : e.event_pools
      return {
        id: `pool:${e.pool_id}`,
        type: 'pool' as const,
        name: pool?.name || 'Pool',
        entityId: e.pool_id,
        isAdmin: pool?.created_by === userId,
      }
    })

    // Fetch DM conversations via API (avoids RLS complexity with browser client)
    let dmChannels: Channel[] = []
    try {
      const dmRes = await fetch('/api/conversations')
      if (dmRes.ok) {
        const dmData = await dmRes.json()
        dmChannels = (dmData.conversations || []).map((c: { id: string; partnerName: string }) => ({
          id: `dm:${c.id}`,
          type: 'dm' as const,
          name: c.partnerName,
          entityId: c.id,
        }))
      }
    } catch { /* skip — DMs just won't appear */ }

    setChannels([...leagueChannels, ...poolChannels, ...dmChannels])
  }, [userId])

  useEffect(() => {
    refreshChannels()
  }, [refreshChannels])

  // Re-fetch channels on page navigation so new DMs/leagues appear
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      refreshChannels()
    }
  }, [pathname, refreshChannels])

  // Reset unread count when a channel becomes active
  useEffect(() => {
    if (activeChannel) {
      setUnreadCounts(prev => {
        if (prev[activeChannel.id] === 0 || prev[activeChannel.id] === undefined) return prev
        return { ...prev, [activeChannel.id]: 0 }
      })
    }
  }, [activeChannel])

  // Subscribe to Realtime INSERTs across all channels to track unread counts
  const activeChannelRef = useRef<Channel | null>(activeChannel)
  useEffect(() => {
    activeChannelRef.current = activeChannel
  }, [activeChannel])

  useEffect(() => {
    if (!userId || channels.length === 0) return

    const supabase = createClient()

    // Build one subscription per message table type
    const tableConfigs: { table: string; filterCol: string; channelType: Channel['type'] }[] = []

    if (channels.some(c => c.type === 'league')) {
      tableConfigs.push({ table: 'league_messages', filterCol: 'league_id', channelType: 'league' })
    }
    if (channels.some(c => c.type === 'pool')) {
      tableConfigs.push({ table: 'event_pool_messages', filterCol: 'pool_id', channelType: 'pool' })
    }
    if (channels.some(c => c.type === 'dm')) {
      tableConfigs.push({ table: 'direct_messages', filterCol: 'conversation_id', channelType: 'dm' })
    }

    const sub = supabase.channel('chat-unread-counts')

    for (const cfg of tableConfigs) {
      sub.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: cfg.table,
      }, (payload) => {
        const newMsg = payload.new as Record<string, string>
        const entityId = newMsg[cfg.filterCol]
        if (!entityId) return

        // Don't count own messages
        if (newMsg.user_id === userId) return

        const channelId = `${cfg.channelType}:${entityId}`

        // Only increment if this channel is NOT currently active
        if (activeChannelRef.current?.id === channelId) return

        setUnreadCounts(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || 0) + 1,
        }))
      })
    }

    sub.subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [userId, channels])

  // Toggle body class for sidebar margin (used by CSS to offset content)
  useEffect(() => {
    const shouldShow = isOpen && !!userId
    document.body.classList.toggle('chat-sidebar-open', shouldShow)
    return () => { document.body.classList.remove('chat-sidebar-open') }
  }, [isOpen, userId])

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      isMobileExpanded,
      setIsMobileExpanded,
      activeChannel,
      setActiveChannel,
      channels,
      unreadCounts,
      userId,
      refreshChannels,
    }}>
      {children}
    </ChatContext.Provider>
  )
}
