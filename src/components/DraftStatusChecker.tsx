'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface DraftStatusCheckerProps {
  leagueId: string
  initialStatus: string
}

export default function DraftStatusChecker({ leagueId, initialStatus }: DraftStatusCheckerProps) {
  const [status, setStatus] = useState(initialStatus)
  const [showNotification, setShowNotification] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Poll for draft status changes every 5 seconds
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('drafts')
        .select('status')
        .eq('league_id', leagueId)
        .single()

      if (data && data.status !== status) {
        setStatus(data.status)
        // Show notification if draft just started
        if (data.status === 'in_progress' && status === 'not_started') {
          setShowNotification(true)
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [leagueId, status, supabase])

  // Show notification banner when draft starts
  if (showNotification && status === 'in_progress') {
    return (
      <div className="fixed top-0 left-0 right-0 bg-green-600 text-white p-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
          <span className="font-semibold">The draft has started!</span>
        </div>
        <Link
          href={`/leagues/${leagueId}/draft`}
          className="bg-white text-green-600 px-4 py-2 rounded font-semibold hover:bg-green-50"
        >
          Join Draft Room
        </Link>
      </div>
    )
  }

  // If status changed to in_progress, show inline
  if (status === 'in_progress' && initialStatus !== 'in_progress') {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-green-400 font-semibold">Draft In Progress</span>
        </div>
        <Link
          href={`/leagues/${leagueId}/draft`}
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Go to Draft Room
        </Link>
      </div>
    )
  }

  return null
}
