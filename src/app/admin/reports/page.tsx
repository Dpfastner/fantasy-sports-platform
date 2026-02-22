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
    bug: 'bg-red-500/20 text-red-400',
    feature: 'bg-blue-500/20 text-blue-400',
    other: 'bg-gray-500/20 text-gray-400',
  }

  const statusColors: Record<string, string> = {
    new: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-green-500/20 text-green-400',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin/sync" className="text-gray-400 hover:text-white">
              Data Sync
            </Link>
            <span className="text-white font-medium">Issue Reports</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Issue Reports</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'new', 'in_progress', 'resolved'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              <span className="ml-2 text-sm opacity-70">({statusCounts[status]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-400">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map(report => (
              <div key={report.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[report.category] || categoryColors.other}`}>
                      {report.category}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[report.status] || statusColors.new}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {report.status !== 'in_progress' && (
                      <button
                        onClick={() => updateStatus(report.id, 'in_progress')}
                        disabled={updating === report.id}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Mark In Progress
                      </button>
                    )}
                    {report.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(report.id, 'resolved')}
                        disabled={updating === report.id}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {report.status === 'resolved' && (
                      <button
                        onClick={() => updateStatus(report.id, 'new')}
                        disabled={updating === report.id}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-white mb-4">{report.description}</p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
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
