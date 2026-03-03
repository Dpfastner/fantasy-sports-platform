'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CURRENT_TOS_VERSION = '2026-04-01'

export default function TosGate() {
  const [showModal, setShowModal] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkTos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return // Not logged in — skip

      setUserId(user.id)

      // Check if user has accepted the current ToS version
      const { data } = await supabase
        .from('tos_agreements')
        .select('id')
        .eq('user_id', user.id)
        .eq('tos_version', CURRENT_TOS_VERSION)
        .limit(1)

      if (!data || data.length === 0) {
        setShowModal(true)
      }
    }

    checkTos()
  }, [supabase])

  const handleAccept = async () => {
    if (!userId) return
    setAccepting(true)

    try {
      const response = await fetch('/api/tos/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tosVersion: CURRENT_TOS_VERSION,
        }),
      })

      if (response.ok) {
        setShowModal(false)
      }
    } catch {
      // Retry silently — modal stays open
    } finally {
      setAccepting(false)
    }
  }

  if (!showModal) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Updated Terms of Service
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            We&apos;ve updated our Terms of Service and Privacy Policy. Please review and accept to continue using Rivyls.
          </p>

          <div className="flex gap-4 text-sm mb-6">
            <Link
              href="/terms"
              target="_blank"
              className="text-brand-text hover:underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              className="text-brand-text hover:underline"
            >
              Privacy Policy
            </Link>
          </div>

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {accepting ? 'Accepting...' : 'I Accept the Updated Terms'}
          </button>
        </div>
      </div>
    </div>
  )
}
