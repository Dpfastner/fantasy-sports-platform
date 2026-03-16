'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/Toast'

interface Announcement {
  id: string
  user_id: string
  display_name: string
  content: string
  is_pinned: boolean
  created_at: string
}

interface PoolAnnouncementsProps {
  poolId: string
  isCreator: boolean
}

export function PoolAnnouncements({ poolId, isCreator }: PoolAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newContent, setNewContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { addToast } = useToast()

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/pools/${poolId}/announcements`)
      if (!res.ok) return
      const data = await res.json()
      setAnnouncements(data.announcements || [])
    } catch {
      // silent
    }
  }, [poolId])

  useEffect(() => {
    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 60000)
    return () => clearInterval(interval)
  }, [fetchAnnouncements])

  const handlePost = async () => {
    if (!newContent.trim() || isPosting) return
    setIsPosting(true)
    try {
      const res = await fetch(`/api/events/pools/${poolId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      })
      if (res.ok) {
        setNewContent('')
        setShowForm(false)
        addToast('Announcement posted', 'success')
        await fetchAnnouncements()
      } else {
        const data = await res.json()
        addToast(data.error || 'Failed to post', 'error')
      }
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsPosting(false)
    }
  }

  const handleDelete = async (announcementId: string) => {
    try {
      const res = await fetch(`/api/events/pools/${poolId}/announcements`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId }),
      })
      if (res.ok) {
        addToast('Announcement deleted', 'success')
        await fetchAnnouncements()
      }
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  if (announcements.length === 0 && !isCreator) return null

  return (
    <div className="bg-surface rounded-lg border border-brand/20 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="brand-h3 text-sm text-text-primary">Bulletin Board</h3>
        </div>
        {isCreator && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-2 py-1 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-brand/40 transition-colors"
          >
            + New
          </button>
        )}
      </div>

      {/* Create form */}
      {isCreator && showForm && (
        <div className="mb-3 space-y-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write an announcement..."
            maxLength={5000}
            rows={3}
            className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setNewContent('') }}
              className="text-xs px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={!newContent.trim() || isPosting}
              className="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-hover text-text-primary font-medium transition-colors disabled:opacity-50"
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {announcements.length === 0 ? (
          <p className="text-text-muted text-xs">No announcements yet. {isCreator ? 'Click "+ New" to post one.' : ''}</p>
        ) : (
          announcements.map(a => (
            <div key={a.id} className="bg-surface-inset rounded-md px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {a.is_pinned && (
                    <svg className="w-3 h-3 text-brand" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                      <path d="M8 9v5a2 2 0 002 2h0a2 2 0 002-2V9" />
                    </svg>
                  )}
                  <span className="text-xs font-medium text-text-secondary">{a.display_name}</span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {isCreator && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-[10px] text-text-muted hover:text-danger-text transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-xs text-text-secondary whitespace-pre-wrap">{a.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
