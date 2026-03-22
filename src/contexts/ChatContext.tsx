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
