'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

interface ChatMessage {
  id: string
  user_id: string | null
  display_name: string
  content: string
  created_at: string
  reactions: { emoji: string; user_id: string | null }[]
}

const EMOJI_OPTIONS = ['\u{1F44D}', '\u{1F44E}', '\u{1F602}', '\u{1F525}', '\u{2764}\u{FE0F}', '\u{1F62E}', '\u{1F3D2}', '\u{1F3C6}', '\u{1F389}']

interface PoolChatProps {
  poolId: string
  userId: string | null
}

export function PoolChat({ poolId, userId }: PoolChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null)
  const { addToast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nameCache = useRef<Record<string, string>>({})

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/pools/${poolId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
      // Populate name cache from fetched messages
      for (const msg of (data.messages || []) as ChatMessage[]) {
        if (msg.user_id && msg.display_name) {
          nameCache.current[msg.user_id] = msg.display_name
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [poolId])

  // Supabase Realtime subscription for messages + reactions
  useEffect(() => {
    fetchMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`pool-chat:${poolId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_pool_messages',
        filter: `pool_id=eq.${poolId}`,
      }, async (payload) => {
        const newMsg = payload.new as { id: string; user_id: string; content: string; created_at: string }

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
          return [...prev, {
            id: newMsg.id,
            user_id: newMsg.user_id,
            display_name: displayName,
            content: newMsg.content,
            created_at: newMsg.created_at,
            reactions: [],
          }]
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_pool_message_reactions',
      }, (payload) => {
        const r = payload.new as { message_id: string; user_id: string; emoji: string }
        setMessages(prev => prev.map(msg => {
          if (msg.id !== r.message_id) return msg
          // Skip if already present
          if (msg.reactions.some(rx => rx.emoji === r.emoji && rx.user_id === r.user_id)) return msg
          return { ...msg, reactions: [...msg.reactions, { emoji: r.emoji, user_id: r.user_id }] }
        }))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'event_pool_message_reactions',
      }, (payload) => {
        const r = payload.old as { message_id: string; user_id: string; emoji: string }
        setMessages(prev => prev.map(msg => {
          if (msg.id !== r.message_id) return msg
          return { ...msg, reactions: msg.reactions.filter(rx => !(rx.emoji === r.emoji && rx.user_id === r.user_id)) }
        }))
      })
      .subscribe()

    // Re-fetch on tab visibility change to catch messages missed while backgrounded
    const handleVisibility = () => {
      if (!document.hidden) fetchMessages()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [poolId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/events/pools/${poolId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      if (res.ok) {
        setNewMessage('')
      } else {
        addToast('Couldn\'t send message. Try again.', 'error')
      }
    } catch {
      addToast('Couldn\'t send message. Try again.', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    setReactionPickerId(null)
    try {
      await fetch(`/api/events/pools/${poolId}/messages/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })
    } catch {
      addToast('Couldn\'t add your reaction. Try again.', 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-sm">Sign in to participate in the chat.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Messages */}
      <div ref={containerRef} className="max-h-[300px] overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.user_id === userId
          // Group reactions by emoji
          const reactionGroups: Record<string, string[]> = {}
          for (const r of msg.reactions) {
            if (!r.user_id) continue
            if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = []
            reactionGroups[r.emoji].push(r.user_id)
          }

          return (
            <div key={msg.id} className={`group ${isOwn ? 'text-right' : ''}`}>
              <div className={`inline-block max-w-[80%] text-left ${isOwn ? 'ml-auto' : ''}`}>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-medium text-text-secondary">{msg.display_name}</span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`rounded-lg px-3 py-1.5 text-sm ${
                  isOwn ? 'bg-brand/10 text-text-primary' : 'bg-surface-inset text-text-secondary'
                }`}>
                  {msg.content}
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {Object.entries(reactionGroups).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                        userId != null && users.includes(userId)
                          ? 'border-brand/40 bg-brand/10'
                          : 'border-border bg-surface-inset hover:border-brand/20'
                      }`}
                    >
                      {emoji} {users.length}
                    </button>
                  ))}

                  {/* Add reaction button */}
                  <div className="relative">
                    <button
                      onClick={() => setReactionPickerId(reactionPickerId === msg.id ? null : msg.id)}
                      className="text-xs px-1 py-0.5 rounded-full border border-transparent text-text-muted opacity-0 group-hover:opacity-100 hover:border-border transition-all"
                    >
                      +
                    </button>
                    {reactionPickerId === msg.id && (
                      <div className="absolute bottom-full left-0 mb-1 bg-surface border border-border rounded-lg p-1.5 flex gap-1 shadow-lg z-10">
                        {EMOJI_OPTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="text-sm hover:bg-surface-inset rounded p-0.5 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-border pt-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={2000}
          className="flex-1 bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}
