'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useChatContext } from '@/contexts/ChatContext'
import { ChannelList } from './ChannelList'
import { ChatMessages, ChatMessage, ReplyingTo } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function MobileChatPeek() {
  const ctx = useChatContext()
  const pathname = usePathname()
  const [latestPreview, setLatestPreview] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('You')
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const sendRef = useRef<((msg: ChatMessage) => void) | null>(null)
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null)

  // Fetch a latest message preview for the peek bar
  useEffect(() => {
    if (!ctx?.channels.length) return

    // Show the active channel name or first channel's name as preview
    if (ctx.activeChannel) {
      setLatestPreview(`Tap to open ${ctx.activeChannel.name} chat`)
    } else {
      setLatestPreview('Tap to open chat')
    }
  }, [ctx?.channels, ctx?.activeChannel])

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

  // Lock both html and body scroll when chat is expanded
  const isMobileExpanded = ctx?.isMobileExpanded ?? false
  useEffect(() => {
    if (isMobileExpanded) {
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.position = 'fixed'
      document.documentElement.style.width = '100%'
      document.documentElement.style.height = '100%'
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      return () => {
        document.documentElement.style.overflow = ''
        document.documentElement.style.position = ''
        document.documentElement.style.width = ''
        document.documentElement.style.height = ''
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.height = ''
      }
    }
  }, [isMobileExpanded])

  // Track visual viewport to eliminate gap between chat and iOS keyboard.
  // When keyboard opens, visualViewport shrinks AND may shift (offsetTop).
  // We position the chat exactly over the visual viewport.
  const [vpStyle, setVpStyle] = useState<{ top: number; height: number } | null>(null)
  useEffect(() => {
    if (!isMobileExpanded) { setVpStyle(null); return }

    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      setVpStyle({ top: vv.offsetTop, height: vv.height })
    }
    onResize()
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [isMobileExpanded])

  if (!ctx) return null

  // Hide for unauthenticated users and on draft pages (draft has its own chat)
  if (!ctx.userId || pathname?.includes('/draft')) return null

  const { setIsMobileExpanded, activeChannel, setActiveChannel, userId } = ctx

  // Full-screen expanded view
  if (isMobileExpanded) {
    return (
      <div className="md:hidden fixed left-0 right-0 z-50 bg-surface flex flex-col overflow-hidden overscroll-none" style={vpStyle ? { top: `${vpStyle.top}px`, height: `${vpStyle.height}px` } : { top: 0, bottom: 0 }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          {activeChannel ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => { setActiveChannel(null); setShowPinnedOnly(false); setReplyingTo(null) }}
                className="p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-text-primary truncate">{activeChannel.name}</span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-text-primary">Chat</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {/* Pin filter */}
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
            {/* DM shortcut */}
            {activeChannel && (
              <button
                onClick={() => {
                  setActiveChannel(null)
                  setShowPinnedOnly(false)
                }}
                className="h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold bg-surface-subtle text-text-muted hover:text-text-primary transition-colors"
                title="Direct Messages"
              >
                DM
              </button>
            )}
            <button
              onClick={() => {
                setIsMobileExpanded(false)
                setActiveChannel(null)
                setShowPinnedOnly(false)
              }}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              onReply={setReplyingTo}
            />
            <ChatInput
              channelType={activeChannel.type}
              channelEntityId={activeChannel.entityId}
              currentUserId={userId}
              currentDisplayName={displayName}
              onMessageSent={(msg) => sendRef.current?.(msg)}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </div>
        ) : (
          <ChannelList />
        )}
      </div>
    )
  }

  // Peek bar — always visible on mobile
  return (
    <div className="md:hidden fixed left-0 right-0 z-40" style={{ bottom: 'var(--footer-h, 0px)' }}>
      <button
        onClick={() => setIsMobileExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface border-t border-border text-left"
      >
        <svg className="w-4 h-4 text-brand-text shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="flex-1 text-xs text-text-secondary truncate">
          {latestPreview}
        </span>
        <svg className="w-3 h-3 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}
