'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchWithRetry } from '@/lib/api/fetch'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  league_id: string | null
  read_at: string | null
  created_at: string
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

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'draft_started': return '🏈'
    case 'draft_your_turn': return '⏰'
    case 'draft_completed': return '🏆'
    case 'announcement_posted': return '📢'
    case 'league_joined': return '👋'
    case 'transaction_completed': return '🔄'
    case 'game_results': return '📊'
    case 'trade_proposed': return '🤝'
    case 'trade_accepted': return '✅'
    case 'trade_rejected': return '❌'
    case 'trade_vetoed': return '🚫'
    case 'trade_cancelled': return '↩️'
    case 'trade_expired':
    case 'trade_expiring': return '⏳'
    case 'event_eliminated': return '💀'
    case 'event_survived': return '🎉'
    case 'event_deadline': return '⏰'
    case 'event_results': return '📊'
    case 'event_pool_joined': return '👋'
    case 'event_tournament_starting': return '🏟️'
    default: return '🔔'
  }
}

function getNotificationHref(notification: Notification): string | null {
  // Event notifications use poolId + tournamentSlug for routing
  if (notification.type.startsWith('event_')) {
    const poolId = notification.data?.poolId as string
    const slug = notification.data?.tournamentSlug as string
    if (poolId && slug) return `/events/${slug}/pools/${poolId}`
    return '/events'
  }

  // Report/ticket notifications
  const reportId = notification.data?.reportId as string
  if (reportId) {
    if (notification.type === 'support_response') return `/tickets/${reportId}`
    return `/admin/reports`
  }

  const leagueId = notification.data?.leagueId || notification.league_id
  if (!leagueId) return null

  switch (notification.type) {
    case 'draft_started':
    case 'draft_your_turn':
      return `/leagues/${leagueId}/draft`
    case 'draft_completed':
    case 'league_joined':
      return `/leagues/${leagueId}`
    case 'announcement_posted':
      return `/leagues/${leagueId}#announcements`
    case 'transaction_completed':
      return `/leagues/${leagueId}/transactions`
    case 'trade_accepted':
      if (notification.data?.vetoable) return `/leagues/${leagueId}/settings`
      return `/leagues/${leagueId}/team`
    case 'trade_proposed':
    case 'trade_rejected':
    case 'trade_cancelled':
    case 'trade_vetoed':
    case 'trade_expired':
    case 'trade_expiring':
      return `/leagues/${leagueId}/team#trades`
    default:
      return null
  }
}

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // Silently fail
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription for new notifications
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newNotif = payload.new as Notification
        setNotifications(prev => {
          if (prev.some(n => n.id === newNotif.id)) return prev
          return [newNotif, ...prev].slice(0, 25)
        })
        setUnreadCount(prev => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as Notification
        setNotifications(prev =>
          prev.map(n => n.id === updated.id ? updated : n)
        )
        // Recalculate unread count
        if (updated.read_at) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && notifications.length === 0) {
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
    }
    setIsOpen(!isOpen)
  }

  const [markAllReadDone, setMarkAllReadDone] = useState(false)

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
      setMarkAllReadDone(true)
      setTimeout(() => setMarkAllReadDone(false), 2000)
    } catch {
      // Silently fail
    }
  }

  const handleClickNotification = async (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      })
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Navigate — handle hash links specially for same-page scroll
    const href = getNotificationHref(notification)
    if (href) {
      setIsOpen(false)
      if (href.includes('#')) {
        const [path, hash] = href.split('#')
        const currentPath = window.location.pathname
        if (currentPath === path) {
          // Already on this page — scroll to element
          const el = document.getElementById(hash)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
            return
          }
        }
      }
      router.push(href)
    }
  }

  const handleToggleRead = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation()
    const isRead = !!notification.read_at
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [notification.id], markUnread: isRead }),
    })
    setNotifications(prev =>
      prev.map(n => n.id === notification.id
        ? { ...n, read_at: isRead ? null : new Date().toISOString() }
        : n
      )
    )
    setUnreadCount(prev => isRead ? prev + 1 : Math.max(0, prev - 1))
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
        title="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-danger text-text-primary text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl z-50 max-h-[400px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            {markAllReadDone ? (
              <span className="text-xs text-success-text">Done!</span>
            ) : unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-text hover:text-brand-text/80 transition-colors"
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-text-muted text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map(notification => {
                const href = getNotificationHref(notification)
                const isUnread = !notification.read_at
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleClickNotification(notification)}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                      href ? 'hover:bg-surface-subtle cursor-pointer' : 'cursor-default'
                    } ${isUnread ? 'bg-brand/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <span className="text-base shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`text-sm truncate ${isUnread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                            {notification.title}
                          </span>
                          <button
                            onClick={(e) => handleToggleRead(e, notification)}
                            className="shrink-0 p-1 -mr-1 group/dot"
                            title={isUnread ? 'Mark as read' : 'Mark as unread'}
                          >
                            <span className={`block w-3 h-3 rounded-full border-2 transition-colors ${
                              isUnread
                                ? 'bg-brand border-brand group-hover/dot:bg-brand/60'
                                : 'border-text-muted/50 group-hover/dot:border-brand group-hover/dot:bg-brand/30'
                            }`} />
                          </button>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                        <span className="text-[10px] text-text-muted mt-1 block">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
