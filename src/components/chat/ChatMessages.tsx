'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ReportContentButton } from '@/components/ReportContentButton'

const EMOJI_SET = ['👍', '👎', '😂', '🔥', '❤️', '😮', '🏈', '🏆', '🎉']

// Render message text with @mentions as styled links
function renderMessageText(text: string) {
  const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g
  const parts: (string | { name: string; userId: string })[] = []
  let lastIndex = 0
  let match

  while ((match = mentionPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push({ name: match[1], userId: match[2] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  if (parts.length === 1 && typeof parts[0] === 'string') {
    return text
  }

  return parts.map((part, i) => {
    if (typeof part === 'string') return part
    return (
      <Link
        key={i}
        href={`/profile/${part.userId}`}
        className="text-brand-text font-semibold hover:underline"
      >
        @{part.name}
      </Link>
    )
  })
}

// Detect if message is a GIF URL
function isGifUrl(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  return /^https?:\/\/.*\.(gif|webp)(\?.*)?$/i.test(trimmed) ||
    trimmed.includes('tenor.com') ||
    trimmed.includes('giphy.com')
}

export interface ChatMessage {
  id: string
  message: string
  created_at: string
  user_id: string
  display_name: string
  pinned_at?: string | null
  pinned_by?: string | null
}

export interface ReactionData {
  emoji: string
  count: number
  reacted: boolean
}

interface ChatMessagesProps {
  channelType: 'league' | 'pool' | 'dm'
  channelEntityId: string
  currentUserId: string
  isCommissioner?: boolean
  onSendRef?: React.MutableRefObject<((msg: ChatMessage) => void) | null>
  showPinnedOnly?: boolean
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ChatMessages({ channelType, channelEntityId, currentUserId, isCommissioner, onSendRef, showPinnedOnly }: ChatMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<Record<string, ReactionData[]>>({})
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [reactionDetailFor, setReactionDetailFor] = useState<string | null>(null)
  const [reactionDetailData, setReactionDetailData] = useState<{ emoji: string; displayName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const nameCache = useRef<Record<string, string>>({})

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  // Expose addMessage so ChatInput can optimistically insert sent messages
  useEffect(() => {
    if (onSendRef) {
      onSendRef.current = (msg: ChatMessage) => {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      }
    }
    return () => { if (onSendRef) onSendRef.current = null }
  }, [onSendRef])

  // Fetch messages on mount or channel change
  useEffect(() => {
    setMessages([])
    setReactions({})
    setLoading(true)

    const fetchMessages = async () => {
      let url = ''
      if (channelType === 'league') {
        url = `/api/leagues/${channelEntityId}/messages`
      } else if (channelType === 'pool') {
        url = `/api/events/pools/${channelEntityId}/messages`
      } else if (channelType === 'dm') {
        url = `/api/conversations/${channelEntityId}/messages`
      }

      try {
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
          setReactions(data.reactions || {})
          for (const msg of data.messages || []) {
            nameCache.current[msg.user_id] = msg.display_name
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [channelType, channelEntityId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    let table = ''
    let filter = ''
    let reactionTable = ''

    if (channelType === 'league') {
      table = 'league_messages'
      filter = `league_id=eq.${channelEntityId}`
      reactionTable = 'league_message_reactions'
    } else if (channelType === 'pool') {
      table = 'event_pool_messages'
      filter = `pool_id=eq.${channelEntityId}`
      reactionTable = 'event_pool_message_reactions'
    } else if (channelType === 'dm') {
      table = 'direct_messages'
      filter = `conversation_id=eq.${channelEntityId}`
      reactionTable = '' // DMs don't have reactions yet
    }

    const channelSub = supabase
      .channel(`chat:${channelType}:${channelEntityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table,
        filter,
      }, async (payload) => {
        const raw = payload.new as Record<string, string>
        // Normalize column name: league_messages uses 'message', event_pool_messages uses 'content'
        const newMsg = {
          id: raw.id,
          message: raw.message || raw.content,
          created_at: raw.created_at,
          user_id: raw.user_id,
        }

        let displayName = nameCache.current[newMsg.user_id]
        if (!displayName) {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', newMsg.user_id)
            .single()
          displayName = data?.display_name || data?.email?.split('@')[0] || 'Unknown'
          nameCache.current[newMsg.user_id] = displayName
        }

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, { ...newMsg, display_name: displayName }]
        })
      })

    if (reactionTable) {
      channelSub
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: reactionTable,
        }, (payload) => {
          const r = payload.new as { message_id: string; user_id: string; emoji: string }
          setReactions(prev => {
            const msgReactions = [...(prev[r.message_id] || [])]
            const idx = msgReactions.findIndex(x => x.emoji === r.emoji)
            if (idx >= 0) {
              msgReactions[idx] = {
                ...msgReactions[idx],
                count: msgReactions[idx].count + 1,
                reacted: msgReactions[idx].reacted || r.user_id === currentUserId,
              }
            } else {
              msgReactions.push({ emoji: r.emoji, count: 1, reacted: r.user_id === currentUserId })
            }
            return { ...prev, [r.message_id]: msgReactions }
          })
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: reactionTable,
        }, (payload) => {
          const r = payload.old as { message_id: string; user_id: string; emoji: string }
          setReactions(prev => {
            const msgReactions = [...(prev[r.message_id] || [])]
            const idx = msgReactions.findIndex(x => x.emoji === r.emoji)
            if (idx >= 0) {
              const newCount = msgReactions[idx].count - 1
              if (newCount <= 0) {
                msgReactions.splice(idx, 1)
              } else {
                msgReactions[idx] = {
                  ...msgReactions[idx],
                  count: newCount,
                  reacted: r.user_id === currentUserId ? false : msgReactions[idx].reacted,
                }
              }
            }
            return { ...prev, [r.message_id]: msgReactions }
          })
        })
    }

    channelSub.subscribe()

    return () => {
      supabase.removeChannel(channelSub)
    }
  }, [channelType, channelEntityId, currentUserId])

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    // Optimistic update
    setReactions(prev => {
      const msgReactions = [...(prev[messageId] || [])]
      const idx = msgReactions.findIndex(x => x.emoji === emoji)
      if (idx >= 0 && msgReactions[idx].reacted) {
        const newCount = msgReactions[idx].count - 1
        if (newCount <= 0) msgReactions.splice(idx, 1)
        else msgReactions[idx] = { ...msgReactions[idx], count: newCount, reacted: false }
      } else if (idx >= 0) {
        msgReactions[idx] = { ...msgReactions[idx], count: msgReactions[idx].count + 1, reacted: true }
      } else {
        msgReactions.push({ emoji, count: 1, reacted: true })
      }
      return { ...prev, [messageId]: msgReactions }
    })
    setPickerOpenFor(null)

    let url = ''
    if (channelType === 'league') {
      url = `/api/leagues/${channelEntityId}/messages/reactions`
    } else if (channelType === 'pool') {
      url = `/api/events/pools/${channelEntityId}/messages/reactions`
    }

    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
        })
      } catch {
        // revert would go here
      }
    }
  }

  const handleViewReactionDetail = async (messageId: string) => {
    if (reactionDetailFor === messageId) {
      setReactionDetailFor(null)
      return
    }

    let url = ''
    if (channelType === 'league') {
      url = `/api/leagues/${channelEntityId}/messages/reactions?messageId=${messageId}`
    } else if (channelType === 'pool') {
      url = `/api/events/pools/${channelEntityId}/messages/reactions?messageId=${messageId}`
    }

    if (url) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setReactionDetailData(data.reactions || [])
          setReactionDetailFor(messageId)
        }
      } catch {
        // silently fail
      }
    }
  }

  const handleTogglePin = async (messageId: string) => {
    if (channelType !== 'league') return

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return m.pinned_at
          ? { ...m, pinned_at: null, pinned_by: null }
          : { ...m, pinned_at: new Date().toISOString(), pinned_by: currentUserId }
      }
      // Unpin any other pinned message
      if (m.id !== messageId && m.pinned_at) return { ...m, pinned_at: null, pinned_by: null }
      return m
    }))

    try {
      await fetch(`/api/leagues/${channelEntityId}/messages/${messageId}/pin`, {
        method: 'PATCH',
      })
    } catch {
      // revert would go here
    }
  }

  // Find pinned message
  const pinnedMessage = messages.find(m => m.pinned_at)

  // Filter messages when showPinnedOnly is active
  const displayMessages = showPinnedOnly ? messages.filter(m => m.pinned_at) : messages

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Pinned message */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-warning/10 border-b border-warning/30 flex items-start gap-2">
          <span className="text-xs">📌</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-text-primary">{pinnedMessage.display_name}: </span>
            <span className="text-xs text-text-secondary">{pinnedMessage.message}</span>
          </div>
          {isCommissioner && channelType === 'league' && (
            <button
              onClick={() => handleTogglePin(pinnedMessage.id)}
              className="text-text-muted hover:text-text-primary text-[10px] shrink-0"
              title="Unpin"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-2 p-3">
        {displayMessages.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            {showPinnedOnly ? 'No pinned messages' : 'No messages yet. Start the conversation!'}
          </p>
        ) : (
          displayMessages.map(msg => {
            const isOwn = msg.user_id === currentUserId
            const msgReactions = reactions[msg.id] || []
            return (
              <div key={msg.id} className="group">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={`/profile/${msg.user_id}`}
                    className={`text-xs font-semibold hover:underline ${isOwn ? 'text-brand-text' : 'text-text-primary'}`}
                  >
                    {msg.display_name}
                  </Link>
                  <span className="text-text-muted text-[10px]">
                    {formatTimeAgo(msg.created_at)}
                  </span>
                </div>
                {isGifUrl(msg.message || '') ? (
                  <div className="mt-1 max-w-[250px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(msg.message || '').trim()}
                      alt="GIF"
                      className="rounded-lg w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm break-words inline">
                    {renderMessageText(msg.message || '')}
                  </p>
                )}
                {channelType !== 'dm' && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 ml-1 align-middle">
                    <button
                      onClick={() => setPickerOpenFor(pickerOpenFor === msg.id ? null : msg.id)}
                      className="p-0.5 text-text-muted hover:text-text-secondary rounded transition-colors"
                      title="Add reaction"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {isCommissioner && channelType === 'league' && (
                      <button
                        onClick={() => handleTogglePin(msg.id)}
                        className="p-0.5 text-text-muted hover:text-text-secondary rounded transition-colors"
                        title={msg.pinned_at ? 'Unpin message' : 'Pin message'}
                      >
                        <svg className="w-3.5 h-3.5" fill={msg.pinned_at ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    )}
                    {!isOwn && (
                      <ReportContentButton
                        contentType="chat_message"
                        contentId={msg.id}
                        contentPreview={msg.message || ''}
                      />
                    )}
                  </span>
                )}

                {/* Emoji picker */}
                {pickerOpenFor === msg.id && (
                  <div className="flex gap-1 mt-1 p-1.5 bg-surface-inset rounded-lg border border-border w-fit">
                    {EMOJI_SET.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="hover:bg-surface-subtle rounded p-1 text-sm transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reaction pills */}
                {msgReactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 relative">
                    {msgReactions.map(r => (
                      <button
                        key={r.emoji}
                        onClick={() => handleToggleReaction(msg.id, r.emoji)}
                        onDoubleClick={() => handleViewReactionDetail(msg.id)}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                          r.reacted
                            ? 'bg-brand/20 border border-brand text-text-primary'
                            : 'bg-surface-inset border border-border text-text-secondary hover:border-text-muted'
                        }`}
                        title="Click to react, double-click for details"
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    ))}
                    {/* Reaction detail popover */}
                    {reactionDetailFor === msg.id && reactionDetailData.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 bg-surface border border-border rounded-lg shadow-lg p-2 z-10 min-w-[120px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-text-muted">Reactions</span>
                          <button
                            onClick={() => setReactionDetailFor(null)}
                            className="text-text-muted hover:text-text-secondary"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {reactionDetailData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-text-secondary">
                            <span>{d.emoji}</span>
                            <span>{d.displayName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
