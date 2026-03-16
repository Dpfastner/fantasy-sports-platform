'use client'

import { useChatContext, Channel } from '@/contexts/ChatContext'

interface OpenChatButtonProps {
  channel: Channel
}

export function OpenChatButton({ channel }: OpenChatButtonProps) {
  const ctx = useChatContext()
  if (!ctx) return null

  const handleOpen = () => {
    ctx.setActiveChannel(channel)
    // Desktop: open sidebar. Mobile: expand peek.
    if (window.innerWidth >= 768) {
      ctx.setIsOpen(true)
    } else {
      ctx.setIsMobileExpanded(true)
    }
  }

  return (
    <button
      onClick={handleOpen}
      className="flex items-center gap-2 px-4 py-3 bg-brand/10 border border-brand/30 rounded-lg text-sm text-text-secondary hover:bg-brand/20 hover:text-text-primary transition-colors w-full"
    >
      <svg className="w-5 h-5 text-brand-text shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span>Open {channel.name} chat in sidebar</span>
      <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
