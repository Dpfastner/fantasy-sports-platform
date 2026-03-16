'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useChatContext } from '@/contexts/ChatContext'
import { ChannelList } from './ChannelList'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function MobileChatPeek() {
  const ctx = useChatContext()
  const pathname = usePathname()
  const [latestPreview, setLatestPreview] = useState<string>('')

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

  if (!ctx) return null

  // Hide for unauthenticated users and on draft pages (draft has its own chat)
  if (!ctx.userId || pathname?.includes('/draft')) return null

  const { isMobileExpanded, setIsMobileExpanded, activeChannel, setActiveChannel, userId } = ctx

  // Full-screen expanded view
  if (isMobileExpanded) {
    return (
      <div className="md:hidden fixed inset-0 z-50 bg-surface flex flex-col">
        {/* Top bar — tap to collapse */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer"
          onClick={() => {
            if (!activeChannel) setIsMobileExpanded(false)
          }}
        >
          {activeChannel ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveChannel(null)
                }}
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMobileExpanded(false)
              setActiveChannel(null)
            }}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {activeChannel && userId ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatMessages
              channelType={activeChannel.type}
              channelEntityId={activeChannel.entityId}
              currentUserId={userId}
            />
            <ChatInput
              channelType={activeChannel.type}
              channelEntityId={activeChannel.entityId}
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
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
