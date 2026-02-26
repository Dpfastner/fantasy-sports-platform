'use client'

import { getEnvironment, shouldShowDevBadge, getEnvironmentDisplayName, getEnvironmentBadgeColor } from '@/lib/env'

/**
 * Shows a floating badge in non-production environments
 * Helps developers/testers know which environment they're in
 */
export default function EnvironmentBadge() {
  // Only render in non-production
  if (!shouldShowDevBadge()) {
    return null
  }

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
