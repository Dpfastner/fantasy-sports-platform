'use client'

import { useState, useEffect, useCallback } from 'react'

interface ActivityEvent {
  id: string
  action: string
  details: Record<string, unknown>
  created_at: string
  user_id: string | null
  display_name?: string | null
}

interface PoolActivityFeedProps {
  poolId: string
  tournamentId: string
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

function getEventIcon(action: string): { path: string; color: string } {
  if (action === 'pool.joined') return { path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'text-success' }
  if (action === 'pool.created') return { path: 'M12 6v6m0 0v6m0-6h6m-6 0H6', color: 'text-brand' }
  if (action === 'picks.submitted') return { path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-success' }
  if (action === 'picks.updated') return { path: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'text-info' }
  if (action === 'round.completed') return { path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'text-brand' }
  if (action === 'entry.eliminated') return { path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-danger' }
  if (action === 'pool.locked') return { path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'text-warning' }
  if (action.startsWith('announcement.')) return { path: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', color: 'text-brand' }
  if (action === 'masters.pimento_cheese') return { path: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', color: 'text-amber-500' }
  if (action === 'masters.crows_nest') return { path: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819', color: 'text-[#8B7355]' }
  return { path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-text-muted' }
}

function getEventDescription(event: ActivityEvent): string {
  const name = event.display_name || (event.details?.display_name as string) || 'Someone'

  switch (event.action) {
    case 'pool.joined': return `${name} joined the pool`
    case 'pool.created': return `${name} created the pool`
    case 'picks.submitted': return `${name} submitted their picks`
    case 'picks.updated': return `${name} updated their picks`
    case 'round.completed': return `Round ${event.details?.round || ''} completed`
    case 'entry.eliminated': return `${name} was eliminated`
    case 'pool.locked': return 'Pool is now locked'
    case 'announcement.created': return `${name} posted an announcement`
    case 'masters.pimento_cheese': return `${(event.details?.entry_name as string) || name} won the Pimento Cheese Award for Round ${event.details?.round || ''}`
    case 'masters.crows_nest': return `${(event.details?.entry_name as string) || name} sent to the Crow's Nest after Round ${event.details?.round || ''}`
    default: return event.action.replace(/[._]/g, ' ')
  }
}

const POOL_ACTIONS = new Set([
  'pool.joined', 'pool.created', 'picks.submitted', 'picks.updated',
  'round.completed', 'entry.eliminated', 'pool.locked',
  'announcement.created', 'announcement.updated', 'announcement.deleted',
  'masters.pimento_cheese', 'masters.crows_nest',
])

export function PoolActivityFeed({ poolId, tournamentId }: PoolActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/pools/${poolId}/activity`)
      if (!res.ok) return
      const data = await res.json()
      setEvents(data.events || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [poolId])

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 30000)
    return () => clearInterval(interval)
  }, [fetchActivity])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = events.filter(e => POOL_ACTIONS.has(e.action))

  if (filtered.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-8 text-center">
        <p className="text-text-secondary">No activity yet.</p>
        <p className="text-text-muted text-sm mt-1">Events like picks submitted, members joining, and results will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {filtered.map(event => {
        const icon = getEventIcon(event.action)
        return (
          <div key={event.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-surface-inset transition-colors">
            <svg className={`w-3.5 h-3.5 shrink-0 ${icon.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
            </svg>
            <span className="text-text-secondary text-xs flex-1 min-w-0 truncate">
              {getEventDescription(event)}
            </span>
            <span className="text-text-muted text-[10px] shrink-0">
              {formatTimeAgo(event.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
