import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const categoryColors: Record<string, string> = {
  bug: 'bg-danger/20 text-danger-text',
  feature: 'bg-brand/20 text-brand-text',
  content: 'bg-accent/20 text-accent',
  other: 'bg-surface-inset text-text-secondary',
}

const statusColors: Record<string, string> = {
  new: 'bg-warning/20 text-warning-text',
  in_progress: 'bg-brand/20 text-brand-text',
  resolved: 'bg-success/20 text-success-text',
}

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tickets } = await supabase
    .from('issue_reports')
    .select('id, category, description, status, priority, response_count, last_response_at, created_at')
    .eq('user_id', user.id)
    .order('last_response_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">My Support Tickets</h1>
          <Link
            href="/help"
            className="text-sm text-brand-text hover:underline"
          >
            Help Center
          </Link>
        </div>

        {!tickets || tickets.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center">
            <p className="text-text-secondary mb-2">No support tickets yet.</p>
            <p className="text-text-muted text-sm">
              Use the report button in the bottom-left corner to submit a ticket.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="block bg-surface rounded-lg p-4 hover:bg-surface-inset/50 transition-colors border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[ticket.category] || categoryColors.other}`}>
                    {ticket.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status] || statusColors.new}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  {(ticket.response_count || 0) > 0 && (
                    <span className="text-xs text-text-muted">
                      {ticket.response_count} {ticket.response_count === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </div>
                <p className="text-text-primary text-sm line-clamp-2">{ticket.description}</p>
                <p className="text-text-muted text-xs mt-2">
                  {ticket.last_response_at
                    ? `Last activity ${new Date(ticket.last_response_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : `Submitted ${new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  }
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
