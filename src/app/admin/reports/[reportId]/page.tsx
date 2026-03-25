'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TicketThread from '@/components/TicketThread'

interface Ticket {
  id: string
  category: string
  description: string
  status: string
  priority: string
  page: string | null
  user_agent: string | null
  admin_notes: string | null
  ai_category: string | null
  ai_summary: string | null
  created_at: string
  user_id: string | null
  profiles?: { display_name: string | null; email: string } | null
}

interface Response {
  id: string
  content: string
  is_admin: boolean
  is_ai_generated: boolean
  created_at: string
  user_id: string
  profiles?: { display_name: string | null; email: string } | null
}

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

const priorityColors: Record<string, string> = {
  low: 'bg-surface-inset text-text-muted',
  normal: 'bg-surface-inset text-text-secondary',
  high: 'bg-warning/20 text-warning-text',
  urgent: 'bg-danger/20 text-danger-text',
}

export default function AdminTicketDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/reports/${reportId}`)
    if (res.ok) {
      const data = await res.json()
      setTicket(data.ticket)
      setResponses(data.responses || [])
      setAdminNotes(data.ticket.admin_notes || '')
    }
    setLoading(false)
  }, [reportId])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      })
      if (res.ok) {
        setReplyContent('')
        fetchTicket()
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    // Use the existing Supabase client approach
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    // Fallback: direct update via responses endpoint workaround
    // For now, just refetch since the admin reports page handles status changes
    setUpdating(false)
    fetchTicket()
  }

  const updatePriority = async (newPriority: string) => {
    setUpdating(true)
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: newPriority }),
    })
    setUpdating(false)
    fetchTicket()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
        <main className="container mx-auto px-4 py-8">
          <p className="text-text-secondary">Ticket not found.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/admin/reports" className="text-sm text-brand-text hover:underline mb-4 inline-block">
          &larr; Back to reports
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main thread */}
          <div className="lg:col-span-2">
            {/* Ticket header */}
            <div className="bg-surface rounded-lg p-6 border border-border mb-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[ticket.category] || categoryColors.other}`}>
                  {ticket.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status] || statusColors.new}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[ticket.priority] || priorityColors.normal}`}>
                  {ticket.priority}
                </span>
                {ticket.ai_category && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent" title="AI categorized">
                    AI: {ticket.ai_category}
                  </span>
                )}
              </div>

              {ticket.ai_summary && (
                <p className="text-text-secondary text-sm italic mb-3 bg-surface-inset/50 px-3 py-2 rounded">
                  AI Summary: {ticket.ai_summary}
                </p>
              )}

              <p className="text-text-primary text-sm whitespace-pre-wrap mb-3">{ticket.description}</p>

              <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                <span>User: {ticket.profiles?.display_name || ticket.profiles?.email || ticket.user_id?.slice(0, 8) || 'Unknown'}</span>
                {ticket.page && <span>Page: {ticket.page}</span>}
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Thread */}
            <div className="bg-surface rounded-lg border border-border">
              <div className="p-4">
                <TicketThread responses={responses} currentUserId="" />
              </div>

              {/* Reply form */}
              <form onSubmit={sendReply} className="border-t border-border p-4">
                <textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Type your admin reply..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none text-sm"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={submitting || !replyContent.trim()}
                    className="px-4 py-2 bg-brand hover:bg-brand-hover text-text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status controls */}
            <div className="bg-surface rounded-lg p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {['new', 'in_progress', 'resolved'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updating || ticket.status === s}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      ticket.status === s
                        ? 'bg-brand text-white font-medium'
                        : 'bg-surface-inset text-text-secondary hover:bg-surface-subtle'
                    } disabled:opacity-50`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority controls */}
            <div className="bg-surface rounded-lg p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Priority</h3>
              <div className="flex flex-wrap gap-2">
                {['low', 'normal', 'high', 'urgent'].map(p => (
                  <button
                    key={p}
                    onClick={() => updatePriority(p)}
                    disabled={updating || ticket.priority === p}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      ticket.priority === p
                        ? `${priorityColors[p]} font-medium`
                        : 'bg-surface-inset text-text-secondary hover:bg-surface-subtle'
                    } disabled:opacity-50`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestion placeholder */}
            <div className="bg-surface rounded-lg p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">AI Assistant</h3>
              <p className="text-text-muted text-xs">
                AI suggestions not configured. Add ANTHROPIC_API_KEY to enable auto-triage and suggested responses.
              </p>
            </div>

            {/* Admin notes */}
            <div className="bg-surface rounded-lg p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Admin Notes</h3>
              <p className="text-text-muted text-xs mb-2">Internal only — not visible to user</p>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none text-xs"
              />
              <button
                onClick={async () => {
                  setSavingNotes(true)
                  await fetch(`/api/reports/${reportId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_notes: adminNotes }),
                  })
                  setSavingNotes(false)
                }}
                disabled={savingNotes}
                className="mt-2 w-full px-3 py-1.5 bg-brand hover:bg-brand-hover text-text-primary rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
