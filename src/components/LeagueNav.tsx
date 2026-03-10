'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLeagueContext } from '@/contexts/LeagueContext'

interface LeagueNavProps {
  leagueId: string
  /** @deprecated — now reads from LeagueContext automatically */
  isCommissioner?: boolean
}

const NAV_ITEMS = [
  { label: 'Overview', path: '' },
  { label: 'My Team', path: '/team' },
  { label: 'Records', path: '/stats' },
  { label: 'Schedule', path: '/schedule' },
  { label: 'Add/Drop', path: '/transactions' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'History', path: '/history' },
  { label: 'League Settings', path: '/settings' },
]

export function LeagueNav({ leagueId }: LeagueNavProps) {
  const pathname = usePathname()
  const basePath = `/leagues/${leagueId}`
  const leagueCtx = useLeagueContext()
  const isCommissioner = leagueCtx?.isCommissioner ?? false

  const items = NAV_ITEMS

  return (
    <nav className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-30">
      <div className="container mx-auto px-4 relative">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {items.map(({ label, path }) => {
            const href = `${basePath}${path}`
            const isActive =
              path === ''
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname.startsWith(href)
            const isSettingsTab = path === '/settings'
            const commissionerHighlight = isSettingsTab && isCommissioner

            return (
              <Link
                key={path}
                href={href}
                className={`py-3 px-4 text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? commissionerHighlight
                      ? 'text-warning-text border-b-2 border-warning font-medium'
                      : 'text-text-primary border-b-2 border-brand font-medium'
                    : commissionerHighlight
                      ? 'text-warning-text/70 hover:text-warning-text'
                      : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {commissionerHighlight && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {label}
              </Link>
            )
          })}
        </div>
        {/* Scroll affordance — right fade gradient on mobile */}
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-surface/80 to-transparent md:hidden" />
      </div>
    </nav>
  )
}
