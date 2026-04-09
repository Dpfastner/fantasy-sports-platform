'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ReportContentButton } from '@/components/ReportContentButton'

const EMOJI_SET = ['👍', '👎', '😂', '🔥', '❤️', '😮', '🏈', '🏆', '🎉']

interface ChatMessage {
  id: string
  message: string
  created_at: string
  user_id: string
  display_name: string
}

interface ReactionData {
  emoji: string
  count: number
  reacted: boolean
}

interface LeagueChatProps {
  leagueId: string
  currentUserId: string
  initialMessages: ChatMessage[]
  initialReactions: Record<string, ReactionData[]>
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

export function LeagueChat({ leagueId, currentUserId, initialMessages, initialReactions }: LeagueChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, ReactionData[]>>(initialReactions)
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nameCache = useRef<Record<string, string>>({})

  // Seed name cache from initial messages
  useEffect(() => {
    for (const msg of initialMessages) {
      nameCache.current[msg.user_id] = msg.display_name
    }
  }, [initialMessages])

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Supabase Realtime subscription for messages + reactions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`league-chat:${leagueId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'league_messages',
        filter: `league_id=eq.${leagueId}`,
      }, async (payload) => {
        const newMsg = payload.new as { id: string; message: string; created_at: string; user_id: string }

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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'league_message_reactions',
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
        table: 'league_message_reactions',
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leagueId, currentUserId])

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    // Optimistic update
    setReactions(prev => {
      const msgReactions = [...(prev[messageId] || [])]
      const idx = msgReactions.findIndex(x => x.emoji === emoji)
      if (idx >= 0 && msgReactions[idx].reacted) {
        // Remove own reaction
        const newCount = msgReactions[idx].count - 1
        if (newCount <= 0) {
          msgReactions.splice(idx, 1)
        } else {
          msgReactions[idx] = { ...msgReactions[idx], count: newCount, reacted: false }
        }
      } else if (idx >= 0) {
        // Add to existing emoji
        msgReactions[idx] = { ...msgReactions[idx], count: msgReactions[idx].count + 1, reacted: true }
      } else {
        // New emoji
        msgReactions.push({ emoji, count: 1, reacted: true })
      }
      return { ...prev, [messageId]: msgReactions }
    })
    setPickerOpenFor(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/messages/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })
      if (!res.ok) {
        throw new Error('Couldn\'t add your reaction. Try again.')
      }
    } catch {
      // Revert on error — re-fetch from server would be ideal but simple revert works
      setReactions(prev => {
        const msgReactions = [...(prev[messageId] || [])]
        const idx = msgReactions.findIndex(x => x.emoji === emoji)
        if (idx >= 0 && msgReactions[idx].reacted) {
          const newCount = msgReactions[idx].count - 1
          if (newCount <= 0) {
            msgReactions.splice(idx, 1)
          } else {
            msgReactions[idx] = { ...msgReactions[idx], count: newCount, reacted: false }
          }
        } else if (idx >= 0) {
          msgReactions[idx] = { ...msgReactions[idx], count: msgReactions[idx].count + 1, reacted: true }
        } else {
          msgReactions.push({ emoji, count: 1, reacted: true })
        }
        return { ...prev, [messageId]: msgReactions }
      })
    }
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Couldn\'t send message. Try again.')
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn\'t send message. Try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col">
      {/* Messages area */}
      <div
        ref={containerRef}
        className="max-h-[300px] overflow-y-auto space-y-2 mb-3"
      >
        {messages.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map(msg => {
            const isOwn = msg.user_id === currentUserId
            const msgReactions = reactions[msg.id] || []
            return (
              <div key={msg.id} className="group px-1">
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
                <p className="text-text-secondary text-sm break-words inline">
                  {msg.message}
                </p>
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
                  {!isOwn && (
                    <ReportContentButton
                      contentType="chat_message"
                      contentId={msg.id}
                      contentPreview={msg.message}
                    />
                  )}
                </span>

                {/* Emoji picker strip */}
                {pickerOpenFor === msg.id && (
                  <div className="flex gap-1 mt-1 ml-0 p-1.5 bg-surface-inset rounded-lg border border-border w-fit">
                    {EMOJI_SET.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="hover:bg-surface-subtle rounded p-1 text-sm transition-colors"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reaction pills */}
                {msgReactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msgReactions.map(r => (
                      <button
                        key={r.emoji}
                        onClick={() => handleToggleReaction(msg.id, r.emoji)}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                          r.reacted
                            ? 'bg-brand/20 border border-brand text-text-primary'
                            : 'bg-surface-inset border border-border text-text-secondary hover:border-text-muted'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-2 p-2 bg-surface border border-danger rounded text-danger text-xs">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
          disabled={sending}
          className="flex-1 px-3 py-2 bg-surface-inset border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
