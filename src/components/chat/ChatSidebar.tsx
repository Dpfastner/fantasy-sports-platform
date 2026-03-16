'use client'

import { useChatContext } from '@/contexts/ChatContext'
import { ChannelList } from './ChannelList'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatSidebar() {
  const ctx = useChatContext()
  if (!ctx) return null

  const { isOpen, activeChannel, setActiveChannel, userId } = ctx

  // Desktop sidebar — hidden on mobile (MobileChatPeek handles mobile)
  if (!isOpen) return null

  return (
    <aside className="hidden md:flex w-[320px] shrink-0 border-l border-border bg-surface flex-col max-h-screen sticky top-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        {activeChannel ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setActiveChannel(null)}
              className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
              title="Back to channels"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-text-primary truncate">{activeChannel.name}</span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-text-primary">Chat</span>
        )}
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
    </aside>
  )
}
