'use client'

import { usePathname } from 'next/navigation'
import { useChatContext } from '@/contexts/ChatContext'
import { ChannelList } from './ChannelList'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatSidebar() {
  const ctx = useChatContext()
  const pathname = usePathname()

  if (!ctx) return null

  const { isOpen, setIsOpen, activeChannel, setActiveChannel, userId, unreadCounts } = ctx

  // Hide entirely for unauthenticated users and on draft pages (draft has its own chat)
  if (!userId || pathname?.includes('/draft')) return null

  const hasUnread = Object.values(unreadCounts).some((c) => c > 0)

  return (
    <>
      {/* Reopen tab — visible only when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30
                     w-8 h-16 bg-surface border border-r-0 border-border
                     rounded-l-lg items-center justify-center
                     text-text-muted hover:text-text-primary hover:bg-surface-subtle
                     transition-colors shadow-md"
          title="Open chat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {hasUnread && (
            <span className="absolute -top-1 -left-1 w-3 h-3 bg-brand rounded-full" />
          )}
        </button>
      )}

      {/* Sidebar — always rendered, slides via translate */}
      <aside
        className={`hidden md:flex w-[320px] fixed right-0 top-[41px] bottom-0
          border-l border-border bg-surface flex-col z-30 overflow-hidden
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
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
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
            title="Close chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      </aside>
    </>
  )
}
