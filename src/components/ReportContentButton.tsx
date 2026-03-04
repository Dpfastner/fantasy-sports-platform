'use client'

import { useState } from 'react'

interface ReportContentButtonProps {
  contentType: string
  contentId: string
  contentPreview: string
}

export function ReportContentButton({ contentType, contentId, contentPreview }: ReportContentButtonProps) {
  const [reported, setReported] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleReport = async () => {
    if (reported || submitting) return
    if (!confirm('Report this content as inappropriate?')) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'content',
          description: `Reported ${contentType} (ID: ${contentId}): "${contentPreview.slice(0, 200)}"`,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      })
      if (res.ok) {
        setReported(true)
      }
    } catch {
      // Silently fail - user can try the global report button instead
    } finally {
      setSubmitting(false)
    }
  }

  if (reported) {
    return (
      <span className="text-text-muted text-[10px]">Reported</span>
    )
  }

  return (
    <button
      onClick={handleReport}
      disabled={submitting}
      className="text-text-muted hover:text-warning transition-colors p-0.5"
      title="Report content"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    </button>
  )
}
