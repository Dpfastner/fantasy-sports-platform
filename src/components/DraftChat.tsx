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

interface DraftChatProps {
  draftId: string
  leagueId: string
  currentUserId: string
  onNewMessage?: () => void
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DraftChat({ draftId, leagueId, currentUserId, onNewMessage }: DraftChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const nameCache = useRef<Record<string, string>>({})

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Fetch initial messages on mount
  useEffect(() => {
    async function loadMessages() {
      const supabase = createClient()

      const { data: messagesData } = await supabase
        .from('draft_messages')
        .select('id, message, created_at, user_id')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!messagesData || messagesData.length === 0) {
        setLoading(false)
        return
      }

      // Enrich with display names
      const userIds = [...new Set(messagesData.map(m => m.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)

      const profileMap: Record<string, string> = {}
      if (profiles) {
        for (const p of profiles) {
          const name = p.display_name || p.email?.split('@')[0] || 'Unknown'
          profileMap[p.id] = name
          nameCache.current[p.id] = name
        }
      }

      const enriched = messagesData.reverse().map(m => ({
        ...m,
        display_name: profileMap[m.user_id] || 'Unknown',
      }))

      setMessages(enriched)
      setLoading(false)
    }

    loadMessages()
  }, [draftId])

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`draft-chat:${draftId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'draft_messages',
        filter: `draft_id=eq.${draftId}`,
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

        // Notify parent of new message from another user
        if (newMsg.user_id !== currentUserId && onNewMessage) {
          onNewMessage()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [draftId])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, draftId }),
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Draft Chat</h2>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-1.5 p-2">
        {loading ? (
          <p className="text-text-muted text-xs text-center py-4">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map(msg => {
            const isOwn = msg.user_id === currentUserId
            return (
              <div key={msg.id} className="group px-1 flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-[11px] font-semibold ${isOwn ? 'text-brand-text' : 'text-text-primary'}`}>
                      {msg.display_name}
                    </span>
                    <span className="text-text-muted text-[9px]">
                      {formatTimeAgo(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-text-secondary text-xs break-words">
                    {msg.message}
                  </p>
                </div>
                {!isOwn && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <ReportContentButton
                      contentType="chat_message"
                      contentId={msg.id}
                      contentPreview={msg.message}
                    />
                  </span>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-2 mb-1 p-1.5 bg-danger/10 border border-danger rounded text-danger text-[10px]">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="p-2 border-t border-border">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chat..."
            maxLength={500}
            disabled={sending}
            className="flex-1 px-2 py-1.5 bg-surface-inset border border-border rounded text-text-primary text-xs placeholder:text-text-muted disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-3 py-1.5 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary text-xs font-medium rounded transition-colors shrink-0"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
