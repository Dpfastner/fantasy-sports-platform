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
      )}

      {/* Draft Status Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Draft Status</h2>

        {status === 'not_started' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="text-yellow-400">Draft Not Started</span>
            </div>
            {draftDate && (
              <p className="text-gray-400 mb-4">
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
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Start Draft
              </Link>
            )}
            {isCommissioner && teamCount >= 1 && !allMembersHaveTeams && (
              <div>
                <p className="text-yellow-500 mb-2">
                  Waiting for all members to create teams ({teamCount}/{memberCount})
                </p>
                <Link
                  href={`/leagues/${leagueId}/draft`}
                  className="inline-block bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Go to Draft Room
                </Link>
              </div>
            )}
            {isCommissioner && teamCount < 1 && (
              <p className="text-gray-500">
                Need at least 1 team to start the draft
              </p>
            )}
            {!isCommissioner && teamCount >= 1 && (
              <div>
                <p className="text-gray-400 mb-3">
                  Waiting for commissioner to start the draft...
                </p>
                <Link
                  href={`/leagues/${leagueId}/draft`}
                  className="inline-block bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-400">Draft In Progress</span>
            </div>
            <Link
              href={`/leagues/${leagueId}/draft`}
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Draft Room
            </Link>
          </div>
        )}

        {status === 'paused' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="text-yellow-400">Draft Paused</span>
            </div>
            <Link
              href={`/leagues/${leagueId}/draft`}
              className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Draft Room
            </Link>
          </div>
        )}

        {status === 'completed' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-blue-400">Draft Completed</span>
            </div>
            <p className="text-gray-400">
              The draft has been completed. Good luck this season!
            </p>
          </div>
        )}

        {/* Fallback for unknown/null status */}
        {!status && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
              <span className="text-gray-400">Draft Not Set Up</span>
            </div>
            {isCommissioner && (
              <Link
                href={`/leagues/${leagueId}/draft`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
