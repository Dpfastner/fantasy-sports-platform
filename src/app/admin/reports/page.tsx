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
  user_agent: string | null
  status: string
  created_at: string
  admin_notes: string | null
  profiles?: { email: string; display_name: string | null } | null
}

export default function AdminReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('issue_reports')
      .select('*, profiles(email, display_name)')
      .order('created_at', { ascending: false })

    if (data) {
      setReports(data)
    }
    if (error) {
      console.error('Error loading reports:', error)
    }
    setLoading(false)
  }

  const updateStatus = async (reportId: string, newStatus: string) => {
    setUpdating(reportId)
    const { error } = await supabase
      .from('issue_reports')
      .update({
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', reportId)

    if (!error) {
      setReports(prev => prev.map(r =>
        r.id === reportId ? { ...r, status: newStatus } : r
      ))
    }
    setUpdating(null)
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

  const categoryColors: Record<string, string> = {
    bug: 'bg-danger/20 text-danger-text',
    feature: 'bg-brand/20 text-brand-text',
    other: 'bg-surface-subtle/20 text-text-secondary',
  }

  const statusColors: Record<string, string> = {
    new: 'bg-warning/20 text-warning-text',
    in_progress: 'bg-brand/20 text-brand-text',
    resolved: 'bg-success/20 text-success-text',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin/sync" className="text-text-secondary hover:text-text-primary">
              Data Sync
            </Link>
            <Link href="/admin/analytics" className="text-text-secondary hover:text-text-primary">
              Analytics
            </Link>
            <Link href="/admin/badges" className="text-text-secondary hover:text-text-primary">
              Badges
            </Link>
            <span className="text-text-primary font-medium">Issue Reports</span>
          </div>
        </div>
      </header>

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
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              <span className="ml-2 text-sm opacity-70">({statusCounts[status]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-text-secondary">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center">
            <p className="text-text-secondary">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map(report => (
              <div key={report.id} className="bg-surface rounded-lg p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[report.category] || categoryColors.other}`}>
                      {report.category}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[report.status] || statusColors.new}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="text-text-muted text-sm">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {report.status !== 'in_progress' && (
                      <button
                        onClick={() => updateStatus(report.id, 'in_progress')}
                        disabled={updating === report.id}
                        className="px-3 py-1 bg-brand hover:bg-brand-hover text-text-primary text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Mark In Progress
                      </button>
                    )}
                    {report.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(report.id, 'resolved')}
                        disabled={updating === report.id}
                        className="px-3 py-1 bg-success hover:bg-success-hover text-text-primary text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {report.status === 'resolved' && (
                      <button
                        onClick={() => updateStatus(report.id, 'new')}
                        disabled={updating === report.id}
                        className="px-3 py-1 bg-surface-subtle hover:bg-surface-subtle text-text-primary text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-text-primary mb-4">{report.description}</p>

                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                  {report.profiles && (
                    <span>User: {report.profiles.display_name || report.profiles.email}</span>
                  )}
                  {report.page && <span>Page: {report.page}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
