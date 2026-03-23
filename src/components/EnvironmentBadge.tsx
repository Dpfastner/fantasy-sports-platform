'use client'

import { useState, useEffect } from 'react'
import { getEnvironment, shouldShowDevBadge, getEnvironmentDisplayName, getEnvironmentBadgeColor } from '@/lib/env'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'

/**
 * Shows a floating badge for admin users only.
 * Helps admins know which environment they're in.
 */
export default function EnvironmentBadge() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && ADMIN_USER_IDS.includes(user.id)) setIsAdmin(true)
    })
  }, [])

  if (!shouldShowDevBadge() || !isAdmin) return null

  const env = getEnvironment()
  const displayName = getEnvironmentDisplayName()
  const colorClass = getEnvironmentBadgeColor()

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`${colorClass} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClass} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClass}`}></span>
        </span>
        {displayName}
        {env === 'sandbox' && (
          <span className="text-warning-text text-[10px]">2025 Data</span>
        )}
      </div>
    </div>
  )
}
