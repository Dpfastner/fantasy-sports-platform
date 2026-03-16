'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────

export interface Channel {
  id: string
  type: 'league' | 'pool' | 'dm'
  name: string
  imageUrl?: string
  entityId: string // leagueId, poolId, or conversationId
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

    // Fetch leagues
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name)')
      .eq('user_id', userId)

    const leagueChannels: Channel[] = (memberships || []).map((m: { league_id: string; leagues: { id: string; name: string } | { id: string; name: string }[] | null }) => {
      const league = Array.isArray(m.leagues) ? m.leagues[0] : m.leagues
      return {
        id: `league:${m.league_id}`,
        type: 'league' as const,
        name: league?.name || 'League',
        entityId: m.league_id,
      }
    })

    // Fetch event pools the user has entries in
    const { data: entries } = await supabase
      .from('event_entries')
      .select('pool_id, event_pools(id, name)')
      .eq('user_id', userId)

    const poolChannels: Channel[] = (entries || []).map((e: { pool_id: string; event_pools: { id: string; name: string } | { id: string; name: string }[] | null }) => {
      const pool = Array.isArray(e.event_pools) ? e.event_pools[0] : e.event_pools
      return {
        id: `pool:${e.pool_id}`,
        type: 'pool' as const,
        name: pool?.name || 'Pool',
        entityId: e.pool_id,
      }
    })

    // Fetch DM conversations
    const { data: convMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)

    let dmChannels: Channel[] = []
    if (convMembers && convMembers.length > 0) {
      const convIds = convMembers.map((cm: { conversation_id: string }) => cm.conversation_id)
      // Get other members' names
      const { data: otherMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id, profiles(display_name, email)')
        .in('conversation_id', convIds)
        .neq('user_id', userId)

      dmChannels = (otherMembers || []).map((om: { conversation_id: string; user_id: string; profiles: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null }) => {
        const profile = Array.isArray(om.profiles) ? om.profiles[0] : om.profiles
        return {
          id: `dm:${om.conversation_id}`,
          type: 'dm' as const,
          name: profile?.display_name || profile?.email?.split('@')[0] || 'User',
          entityId: om.conversation_id,
        }
      })
    }

    setChannels([...leagueChannels, ...poolChannels, ...dmChannels])
  }, [userId])

  useEffect(() => {
    refreshChannels()
  }, [refreshChannels])

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
