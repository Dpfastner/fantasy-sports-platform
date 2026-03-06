interface ActivityEvent {
  id: string
  action: string
  details: Record<string, unknown>
  created_at: string
  user_id: string | null
  display_name: string | null
}

interface LeagueActivityFeedProps {
  events: ActivityEvent[]
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
  if (action.startsWith('draft.')) {
    return {
      path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'text-info',
    }
  }
  if (action === 'transaction.completed') {
    return {
      path: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      color: 'text-warning',
    }
  }
  if (action === 'league.joined') {
    return {
      path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      color: 'text-success',
    }
  }
  if (action.startsWith('announcement.')) {
    return {
      path: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
      color: 'text-brand',
    }
  }
  if (action.startsWith('member.')) {
    return {
      path: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      color: 'text-text-secondary',
    }
  }
  if (action === 'league.settings_changed') {
    return {
      path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      color: 'text-text-muted',
    }
  }
  if (action.startsWith('trade.')) {
    return {
      path: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      color: 'text-brand',
    }
  }
  if (action === 'double_points.pick_made') {
    return {
      path: 'M13 10V3L4 14h7v7l9-11h-7z',
      color: 'text-info',
    }
  }
  // Default
  return {
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-text-muted',
  }
}

function getEventDescription(event: ActivityEvent): string {
  const name = event.display_name || 'Someone'
  const details = event.details || {}

  switch (event.action) {
    case 'league.joined':
      return `${name} joined the league`
    case 'league.created':
      return `${name} created the league`
    case 'league.settings_changed':
      return 'League settings were updated'

    case 'draft.started':
      return 'Draft started'
    case 'draft.completed':
      return 'Draft completed'
    case 'draft.pick_made':
      return `${name} made a draft pick`
    case 'draft.pick_skipped':
      return `${name}'s pick was skipped`
    case 'draft.reset':
      return 'Draft was reset'
    case 'draft.paused':
      return 'Draft was paused'
    case 'draft.resumed':
      return 'Draft was resumed'

    case 'transaction.completed':
      return `${name} made an add/drop`
    case 'double_points.pick_made':
      return `${name} set a double points pick`
    case 'double_points.pick_removed':
      return `${name} removed a double points pick`

    case 'member.role_changed':
      return `${name}'s role was changed`
    case 'member.removed':
      return `A member was removed`
    case 'member.payment_toggled':
      return `Payment status updated`
    case 'second_owner.added':
      return 'A second owner was added'
    case 'second_owner.removed':
      return 'A second owner was removed'

    case 'announcement.created':
      return `${name} posted an announcement`
    case 'announcement.updated':
      return `${name} updated an announcement`
    case 'announcement.deleted':
      return `${name} deleted an announcement`

    case 'team.edited':
      return `${name} updated their team`

    case 'trade.proposed': {
      const proposer = (details.proposerTeam as string) || name
      const receiver = (details.receiverTeam as string) || 'another team'
      return `${proposer} proposed a trade to ${receiver}`
    }
    case 'trade.accepted': {
      const proposer = (details.proposerTeam as string) || 'A team'
      const receiver = (details.receiverTeam as string) || 'another team'
      return `Trade accepted between ${proposer} and ${receiver}`
    }
    case 'trade.executed':
      return 'A trade was executed'
    case 'trade.rejected':
      return `${name} rejected a trade offer`
    case 'trade.cancelled':
      return `${name} cancelled a trade offer`
    case 'trade.vetoed':
      return 'A trade was vetoed by the commissioner'
    case 'trade.expired':
      return 'A trade offer expired'
    case 'trade.countered':
      return `${name} countered a trade offer`

    default:
      return `${event.action.replace(/[._]/g, ' ')}`
  }
}

// League-relevant actions to show in the feed
const FEED_ACTIONS = new Set([
  'league.joined',
  'league.created',
  'league.settings_changed',
  'draft.started',
  'draft.completed',
  'draft.pick_made',
  'draft.pick_skipped',
  'draft.reset',
  'draft.paused',
  'draft.resumed',
  'transaction.completed',
  'double_points.pick_made',
  'double_points.pick_removed',
  'member.role_changed',
  'member.removed',
  'member.payment_toggled',
  'second_owner.added',
  'second_owner.removed',
  'announcement.created',
  'announcement.updated',
  'announcement.deleted',
  'team.edited',
  'trade.executed',
  'trade.vetoed',
])

export function LeagueActivityFeed({ events }: LeagueActivityFeedProps) {
  const filtered = events.filter(e => FEED_ACTIONS.has(e.action))

  if (filtered.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-4">
        No recent activity yet. Events like draft picks, transactions, and more will appear here.
      </p>
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
