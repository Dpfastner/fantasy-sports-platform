'use client'

import { useState, useEffect } from 'react'

interface FirstVisitExplainerProps {
  leagueId: string
}

const STORAGE_KEY = 'rivyls_dismissed_explainer'

export function FirstVisitExplainer({ leagueId }: FirstVisitExplainerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (!dismissed[leagueId]) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [leagueId])

  const dismiss = () => {
    setVisible(false)
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      dismissed[leagueId] = true
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
    } catch {
      // ignore
    }
  }

  if (!visible) return null

  return (
    <div className="bg-surface border border-brand/30 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
      <p className="text-text-secondary text-sm flex-1">
        <span className="text-text-primary font-medium">How it works:</span>{' '}
        You drafted college programs. They score points from real games every Saturday. Highest total score wins the season. That&apos;s it.
      </p>
      <button
        onClick={dismiss}
        className="text-text-muted hover:text-text-primary text-sm shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
