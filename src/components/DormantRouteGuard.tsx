'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLeagueContext } from '@/contexts/LeagueContext'

const ALLOWED_DORMANT_SEGMENTS = ['history']

export function DormantRouteGuard({ leagueId }: { leagueId: string }) {
  const ctx = useLeagueContext()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!ctx?.isDormant) return

    const basePath = `/leagues/${leagueId}`
    // Main league page is fine
    if (pathname === basePath || pathname === `${basePath}/`) return

    // Check if the segment is allowed for dormant leagues
    const segment = pathname.replace(basePath + '/', '').split('/')[0]
    if (ALLOWED_DORMANT_SEGMENTS.includes(segment)) return

    // Redirect to main league page
    router.replace(basePath)
  }, [ctx?.isDormant, pathname, leagueId, router])

  return null
}
