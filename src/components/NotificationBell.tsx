'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    default: return '🔔'
  }
}

function getNotificationHref(notification: Notification): string | null {
  const leagueId = notification.data?.leagueId || notification.league_id
  if (!leagueId) return null

  switch (notification.type) {
    case 'draft_started':
    case 'draft_your_turn':
      return `/leagues/${leagueId}/draft`
    case 'draft_completed':
      return `/leagues/${leagueId}/stats`
    case 'league_joined':
    case 'announcement_posted':
      return `/leagues/${leagueId}`
    case 'transaction_completed':
      return `/leagues/${leagueId}/transactions`
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
      const res = await fetch('/api/notifications')
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
          return [newNotif, ...prev].slice(0, 50)
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

    // Navigate
    const href = getNotificationHref(notification)
    if (href) {
      setIsOpen(false)
      router.push(href)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-1.5 text-text-secondary hover:text-text-primary transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-text hover:text-brand-text/80 transition-colors"
              >
                Mark all as read
              </button>
            )}
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
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                          )}
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
