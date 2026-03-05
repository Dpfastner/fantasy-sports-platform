'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportContentButton } from '@/components/ReportContentButton'

interface ChatMessage {
  id: string
  message: string
  created_at: string
  user_id: string
  display_name: string
}

interface LeagueChatProps {
  leagueId: string
  currentUserId: string
  initialMessages: ChatMessage[]
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

export function LeagueChat({ leagueId, currentUserId, initialMessages }: LeagueChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Supabase Realtime subscription
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

        // Get display name from cache or fetch it
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
          // Avoid duplicates (e.g. if we already added it optimistically)
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, { ...newMsg, display_name: displayName }]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leagueId])

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
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
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
            return (
              <div key={msg.id} className="group flex items-start gap-2 px-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-semibold ${isOwn ? 'text-brand-text' : 'text-text-primary'}`}>
                      {msg.display_name}
                    </span>
                    <span className="text-text-muted text-[10px]">
                      {formatTimeAgo(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm break-words">{msg.message}</p>
                </div>
                {!isOwn && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                    <ReportContentButton
                      contentType="chat_message"
                      contentId={msg.id}
                      contentPreview={msg.message}
                    />
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
        <div className="mb-2 p-2 bg-danger/10 border border-danger rounded text-danger text-xs">
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
