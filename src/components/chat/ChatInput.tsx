'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TrashTalkPicker } from './TrashTalkPicker'
import { GifPicker } from './GifPicker'

interface MemberOption {
  id: string
  display_name: string
}

interface ChatInputProps {
  channelType: 'league' | 'pool' | 'dm'
  channelEntityId: string
}

export function ChatInput({ channelType, channelEntityId }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [showTrashTalk, setShowTrashTalk] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch members for @mention autocomplete
  useEffect(() => {
    if (channelType === 'dm') return

    const fetchMembers = async () => {
      let url = ''
      if (channelType === 'league') {
        url = `/api/leagues/${channelEntityId}/members`
      } else if (channelType === 'pool') {
        url = `/api/events/pools/${channelEntityId}/members`
      }
      if (!url) return

      try {
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.members || [])
        }
      } catch {
        // silently fail
      }
    }

    fetchMembers()
  }, [channelType, channelEntityId])

  const filteredMembers = mentionQuery !== null
    ? members.filter(m =>
        m.display_name.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : []

  const handleInputChange = (value: string) => {
    setInput(value)

    // Detect @mention trigger
    const cursorPos = inputRef.current?.selectionStart || value.length
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = useCallback((member: MemberOption) => {
    const cursorPos = inputRef.current?.selectionStart || input.length
    const textBeforeCursor = input.slice(0, cursorPos)
    const atIdx = textBeforeCursor.lastIndexOf('@')
    if (atIdx < 0) return

    const before = input.slice(0, atIdx)
    const after = input.slice(cursorPos)
    const mention = `@[${member.display_name}](${member.id})`
    setInput(before + mention + ' ' + after)
    setMentionQuery(null)

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [input])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)
    setMentionQuery(null)

    let url = ''
    if (channelType === 'league') {
      url = `/api/leagues/${channelEntityId}/messages`
    } else if (channelType === 'pool') {
      url = `/api/events/pools/${channelEntityId}/messages`
    } else if (channelType === 'dm') {
      url = `/api/conversations/${channelEntityId}/messages`
    }

    try {
      const res = await fetch(url, {
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
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border flex flex-col">
      {/* Trash Talk picker */}
      {showTrashTalk && (
        <div className="max-h-48 overflow-y-auto border-b border-border">
          <TrashTalkPicker
            onSelect={(prompt) => {
              setInput(prompt)
              setShowTrashTalk(false)
              inputRef.current?.focus()
            }}
            onClose={() => setShowTrashTalk(false)}
          />
        </div>
      )}

      {/* GIF picker */}
      {showGifPicker && (
        <div className="max-h-64 overflow-y-auto border-b border-border">
          <GifPicker
            onSelect={(gifUrl) => {
              setInput(gifUrl)
              setShowGifPicker(false)
              // Auto-send GIF
              setTimeout(() => {
                const sendBtn = document.querySelector('[data-chat-send]') as HTMLButtonElement
                sendBtn?.click()
              }, 50)
            }}
            onClose={() => setShowGifPicker(false)}
          />
        </div>
      )}

      {/* @Mention dropdown */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-b border-border bg-surface">
          {filteredMembers.map((m, i) => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === mentionIndex
                  ? 'bg-brand/15 text-text-primary'
                  : 'text-text-secondary hover:bg-surface-subtle'
              }`}
            >
              {m.display_name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mx-3 mt-2 p-2 bg-danger/10 border border-danger rounded text-danger text-xs">
          {error}
        </div>
      )}

      <div className="flex gap-1.5 items-center p-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          maxLength={500}
          disabled={sending}
          className="flex-1 px-3 py-2 bg-surface-inset border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted disabled:opacity-50"
        />
        {channelType !== 'dm' && (
          <>
            <button
              onClick={() => { setShowTrashTalk(!showTrashTalk); setShowGifPicker(false) }}
              className="p-2 text-text-muted hover:text-warning transition-colors shrink-0"
              title="Trash Talk"
            >
              <span className="text-sm">🔥</span>
            </button>
            <button
              onClick={() => { setShowGifPicker(!showGifPicker); setShowTrashTalk(false) }}
              className="p-2 text-text-muted hover:text-text-secondary transition-colors shrink-0"
              title="Send GIF"
            >
              <span className="text-[10px] font-bold">GIF</span>
            </button>
          </>
        )}
        <button
          data-chat-send
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-3 py-2 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
