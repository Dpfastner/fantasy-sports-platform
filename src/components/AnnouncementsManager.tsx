'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReportContentButton } from '@/components/ReportContentButton'
import { fetchWithRetry } from '@/lib/api/fetch'

interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  commissioner_id: string
  scheduled_at?: string | null
}

interface AnnouncementsManagerProps {
  leagueId: string
  leagueName: string
  announcements: Announcement[]
  commissionerNames: Record<string, string>
  isCommissioner: boolean
}

export function AnnouncementsManager({
  leagueId,
  leagueName,
  announcements: initialAnnouncements,
  commissionerNames,
  isCommissioner,
}: AnnouncementsManagerProps) {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', body: '', pinned: false, scheduled_at: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetchWithRetry(`/api/leagues/${leagueId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          pinned: form.pinned,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create post')
      setAnnouncements(prev => [data.announcement, ...prev])
      setForm({ title: '', body: '', pinned: false, scheduled_at: '' })
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetchWithRetry(`/api/leagues/${leagueId}/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update announcement')
      setAnnouncements(prev => prev.map(a => a.id === id ? data.announcement : a))
      setEditingId(null)
      setForm({ title: '', body: '', pinned: false, scheduled_at: '' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    try {
      const res = await fetchWithRetry(`/api/leagues/${leagueId}/announcements/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete announcement')
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement')
    }
  }

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const res = await fetchWithRetry(`/api/leagues/${leagueId}/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !currentPinned }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update pin')
      setAnnouncements(prev => prev.map(a => a.id === id ? data.announcement : a))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pin')
    }
  }

  const startEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({ title: a.title, body: a.body, pinned: a.pinned, scheduled_at: a.scheduled_at || '' })
    setShowForm(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ title: '', body: '', pinned: false, scheduled_at: '' })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Sort announcements: pinned first, then by created_at desc
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-danger/10 border border-danger rounded text-danger text-sm">
          {error}
        </div>
      )}

      {/* Announcements list (capped to ~2 visible, scrollable for more) */}
      <div className="max-h-[200px] overflow-y-auto">
      {sortedAnnouncements.length > 0 ? (
        sortedAnnouncements.map(a => {
          const commName = commissionerNames[a.commissioner_id] || 'Commissioner'
          const isEditing = editingId === a.id

          if (isEditing) {
            return (
              <div key={a.id} className="p-3 bg-surface-inset rounded-lg border border-brand">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={200}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted"
                    placeholder="Title"
                  />
                  <textarea
                    value={form.body}
                    onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                    maxLength={2000}
                    rows={3}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted resize-none"
                    placeholder="Write your post..."
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.pinned}
                        onChange={e => setForm(prev => ({ ...prev, pinned: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-border bg-surface"
                      />
                      Pin to top
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-text-secondary text-xs rounded-lg hover:bg-surface-subtle transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(a.id)}
                        disabled={saving || !form.title.trim() || !form.body.trim()}
                        className="px-3 py-1.5 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary text-xs font-medium rounded-lg transition-colors"
                      >
                        {saving ? 'Saving...' : 'Update'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={a.id} className="p-3 bg-surface-inset rounded-lg border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {a.pinned && (
                      <svg className="w-3.5 h-3.5 text-warning shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                      </svg>
                    )}
                    <h3 className="text-sm font-semibold text-text-primary truncate">{a.title}</h3>
                    {a.scheduled_at && new Date(a.scheduled_at) > new Date() && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded-full shrink-0">
                        Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm whitespace-pre-wrap">{a.body}</p>
                  <p className="text-text-muted text-xs mt-2">
                    — <a href={`/profile/${a.commissioner_id}`} className="hover:underline">{commName}</a>, {a.scheduled_at && new Date(a.scheduled_at) > new Date() ? `publishes ${formatDate(a.scheduled_at)}` : formatDate(a.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isCommissioner && (
                    <>
                      <button
                        onClick={() => handleTogglePin(a.id, a.pinned)}
                        className={`p-1 rounded transition-colors ${a.pinned ? 'text-warning hover:text-warning/70' : 'text-text-muted hover:text-text-secondary'}`}
                        title={a.pinned ? 'Unpin' : 'Pin'}
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => startEdit(a)}
                        className="p-1 text-text-muted hover:text-text-secondary rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 text-text-muted hover:text-danger rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                  <ReportContentButton
                    contentType="announcement"
                    contentId={a.id}
                    contentPreview={`${a.title}: ${a.body}`}
                  />
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="p-3 bg-surface-inset rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">Welcome to {leagueName}!</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {isCommissioner
              ? 'Post updates here to keep your league members informed. Click below to create your first post.'
              : 'Bulletin board posts from your commissioner will appear here. Stay tuned!'}
          </p>
        </div>
      )}
      </div>

      {/* Commissioner: "Post an announcement..." trigger / inline form */}
      {isCommissioner && !editingId && (
        showForm ? (
          <div className="p-3 bg-surface-inset rounded-lg border border-brand">
            <div className="space-y-3">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                maxLength={200}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted"
                placeholder="Title"
                autoFocus
              />
              <textarea
                value={form.body}
                onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                maxLength={2000}
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted resize-none"
                placeholder="Write your post..."
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={e => setForm(prev => ({ ...prev, pinned: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-border bg-surface"
                  />
                  Pin to top
                </label>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-text-secondary">Schedule:</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => setForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                    className="px-2 py-1 bg-surface border border-border rounded text-text-primary text-xs"
                  />
                  {form.scheduled_at && (
                    <button
                      onClick={() => setForm(prev => ({ ...prev, scheduled_at: '' }))}
                      className="text-text-muted hover:text-text-secondary text-xs"
                      title="Clear schedule"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setShowForm(false); setForm({ title: '', body: '', pinned: false, scheduled_at: '' }) }}
                  className="px-3 py-1.5 text-text-secondary text-xs rounded-lg hover:bg-surface-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.title.trim() || !form.body.trim()}
                  className="px-3 py-1.5 bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary text-xs font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Posting...' : form.scheduled_at ? 'Schedule' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full p-3 text-left text-text-muted text-sm rounded-lg border border-dashed border-border hover:border-brand hover:text-brand-text transition-colors"
          >
            Post to bulletin board...
          </button>
        )
      )}
    </div>
  )
}
