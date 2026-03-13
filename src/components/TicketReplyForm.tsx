'use client'

import { useState } from 'react'

interface TicketReplyFormProps {
  reportId: string
  onSuccess?: () => void
  placeholder?: string
  initialContent?: string
  isAiGenerated?: boolean
}

export default function TicketReplyForm({
  reportId,
  onSuccess,
  placeholder = 'Type your reply...',
  initialContent = '',
  isAiGenerated = false,
}: TicketReplyFormProps) {
  const [content, setContent] = useState(initialContent)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send reply')
      }

      setContent('')
      onSuccess?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4">
      {error && (
        <div className="mb-3 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-danger-text text-sm">
          {error}
        </div>
      )}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none text-sm"
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send Reply'}
        </button>
      </div>
    </form>
  )
}
