'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Report {
  id: string
  category: string
  description: string
  user_id: string | null
  page: string | null
  status: string
  priority: string
  ai_category: string | null
  ai_summary: string | null
  response_count: number
  last_response_at: string | null
  created_at: string
  admin_notes: string | null
  profiles?: { email: string; display_name: string | null } | null
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
  high: 'bg-warning/20 text-warning-text',
  urgent: 'bg-danger/20 text-danger-text',
}

export default function AdminReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all')

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('issue_reports')
      .select('*, profiles!issue_reports_user_id_fkey(email, display_name)')
      .order('created_at', { ascending: false })

    if (data) setReports(data)
    if (error) console.error('Error loading reports:', error)
    setLoading(false)
  }

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter)

  const statusCounts = {
    all: reports.length,
    new: reports.filter(r => r.status === 'new').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Issue Reports</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'new', 'in_progress', 'resolved'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status
                  ? 'bg-brand text-text-primary'
                  : 'bg-surface text-text-secondary hover:bg-surface-subtle'
              }`}
            >
              {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-sm opacity-70">({statusCounts[status]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center">
            <p className="text-text-secondary">No reports yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map(report => (
              <Link
                key={report.id}
                href={`/admin/reports/${report.id}`}
                className="block bg-surface rounded-lg p-5 hover:bg-surface-inset/30 transition-colors border border-border"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[report.category] || categoryColors.other}`}>
                      {report.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[report.status] || statusColors.new}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    {report.priority && priorityColors[report.priority] && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[report.priority]}`}>
                        {report.priority}
                      </span>
                    )}
                    {report.ai_category && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                        AI: {report.ai_category}
                      </span>
                    )}
                    <span className="text-text-muted text-xs">
                      {new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(report.response_count || 0) > 0 && (
                      <span className="text-xs text-text-muted bg-surface-inset px-2 py-0.5 rounded">
                        {report.response_count} {report.response_count === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <p className="text-text-primary text-sm line-clamp-2 mb-1">{report.description}</p>

                {report.ai_summary && (
                  <p className="text-text-secondary text-xs italic mb-1">AI: {report.ai_summary}</p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  {report.profiles && (
                    <span>{report.profiles.display_name || report.profiles.email}</span>
                  )}
                  {report.page && <span>{report.page}</span>}
                  {report.last_response_at && (
                    <span>Last reply: {new Date(report.last_response_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
