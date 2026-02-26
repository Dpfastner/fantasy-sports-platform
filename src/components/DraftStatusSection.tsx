'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface DraftStatusSectionProps {
  leagueId: string
  initialStatus: string
  isCommissioner: boolean
  teamCount: number
  memberCount: number
  draftDate: string | null
}

export default function DraftStatusSection({
  leagueId,
  initialStatus,
  isCommissioner,
  teamCount,
  memberCount,
  draftDate
}: DraftStatusSectionProps) {
  // Check if all members have created teams
  const allMembersHaveTeams = teamCount >= memberCount
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
        // Show notification if draft just started
        if (data.status === 'in_progress' && status === 'not_started') {
          setShowNotification(true)
        }
        setStatus(data.status)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [leagueId, status, supabase])

  return (
    <>
      {/* Notification Banner when draft starts */}
      {showNotification && status === 'in_progress' && (
        <div className="fixed top-0 left-0 right-0 bg-success text-text-primary p-4 z-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-text-primary rounded-full animate-pulse"></span>
            <span className="font-semibold">The draft has started!</span>
          </div>
          <Link
            href={`/leagues/${leagueId}/draft`}
            className="bg-text-primary text-success px-4 py-2 rounded font-semibold hover:bg-success-hover"
          >
            Join Draft Room
          </Link>
        </div>
      )}

      {/* Draft Status Section */}
      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Draft Status</h2>

        {status === 'not_started' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-warning rounded-full"></span>
              <span className="text-warning-text">Draft Not Started</span>
            </div>
            {draftDate && (
              <p className="text-text-secondary mb-4">
                Scheduled: {new Date(draftDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
            {isCommissioner && teamCount >= 1 && allMembersHaveTeams && (
              <Link
                href={`/leagues/${leagueId}/draft`}
                className="inline-block bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Start Draft
              </Link>
            )}
            {isCommissioner && teamCount >= 1 && !allMembersHaveTeams && (
              <div>
                <p className="text-warning mb-2">
                  Waiting for all members to create teams ({teamCount}/{memberCount})
                </p>
                <Link
                  href={`/leagues/${leagueId}/draft`}
                  className="inline-block bg-surface-subtle hover:bg-surface-subtle text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Go to Draft Room
                </Link>
              </div>
            )}
            {isCommissioner && teamCount < 1 && (
              <p className="text-text-muted">
                Need at least 1 team to start the draft
              </p>
            )}
            {!isCommissioner && teamCount >= 1 && (
              <div>
                <p className="text-text-secondary mb-3">
                  Waiting for commissioner to start the draft...
                </p>
                <Link
                  href={`/leagues/${leagueId}/draft`}
                  className="inline-block bg-surface-subtle hover:bg-surface-subtle text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Go to Draft Room
                </Link>
              </div>
            )}
          </div>
        )}

        {status === 'in_progress' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-success rounded-full animate-pulse"></span>
              <span className="text-success-text">Draft In Progress</span>
            </div>
            <Link
              href={`/leagues/${leagueId}/draft`}
              className="inline-block bg-success hover:bg-success-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Draft Room
            </Link>
          </div>
        )}

        {status === 'paused' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-warning rounded-full"></span>
              <span className="text-warning-text">Draft Paused</span>
            </div>
            <Link
              href={`/leagues/${leagueId}/draft`}
              className="inline-block bg-warning hover:bg-warning-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Draft Room
            </Link>
          </div>
        )}

        {status === 'completed' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-brand rounded-full"></span>
              <span className="text-brand-text">Draft Completed</span>
            </div>
            <p className="text-text-secondary">
              The draft has been completed. Good luck this season!
            </p>
          </div>
        )}

        {/* Fallback for unknown/null status */}
        {!status && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-surface-subtle rounded-full"></span>
              <span className="text-text-secondary">Draft Not Set Up</span>
            </div>
            {isCommissioner && (
              <Link
                href={`/leagues/${leagueId}/draft`}
                className="inline-block bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Set Up Draft
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
