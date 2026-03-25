import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TicketThread from '@/components/TicketThread'
import TicketReplyForm from '@/components/TicketReplyForm'

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

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ reportId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { reportId } = await params
  const admin = createAdminClient()

  // Fetch ticket (admin client to get full data, then check ownership)
  const { data: ticket } = await admin
    .from('issue_reports')
    .select('id, category, description, status, priority, page, created_at, user_id')
    .eq('id', reportId)
    .single()

  if (!ticket || ticket.user_id !== user.id) {
    redirect('/tickets')
  }

  // Fetch responses
  const { data: responses } = await admin
    .from('ticket_responses')
    .select('id, content, is_admin, is_ai_generated, created_at, user_id, profiles(display_name, email)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/tickets" className="text-sm text-brand-text hover:underline mb-4 inline-block">
          &larr; Back to tickets
        </Link>

        {/* Ticket header */}
        <div className="bg-surface rounded-lg p-6 border border-border mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[ticket.category] || categoryColors.other}`}>
              {ticket.category}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status] || statusColors.new}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className="text-text-muted text-xs">
              {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <p className="text-text-primary text-sm whitespace-pre-wrap">{ticket.description}</p>
          {ticket.page && (
            <p className="text-text-muted text-xs mt-2">Submitted from: {ticket.page}</p>
          )}
        </div>

        {/* Resolved banner */}
        {ticket.status === 'resolved' && (
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 mb-4 text-success-text text-sm">
            This ticket has been resolved. You can still reply to reopen it.
          </div>
        )}

        {/* Conversation thread */}
        <div className="bg-surface rounded-lg border border-border mb-4">
          <div className="p-4">
            <TicketThread responses={responses || []} currentUserId={user.id} />
          </div>
          <TicketReplyForm reportId={reportId} />
        </div>
      </main>
    </div>
  )
}
