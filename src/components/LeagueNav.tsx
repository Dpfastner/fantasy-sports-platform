'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface LeagueNavProps {
  leagueId: string
  isCommissioner?: boolean
}

const NAV_ITEMS = [
  { label: 'Overview', path: '' },
  { label: 'My Team', path: '/team' },
  { label: 'Standings', path: '/stats' },
  { label: 'Schedule', path: '/schedule' },
  { label: 'Add/Drop', path: '/transactions' },
  { label: 'Bracket', path: '/bracket' },
  { label: 'History', path: '/history' },
]

export function LeagueNav({ leagueId, isCommissioner = false }: LeagueNavProps) {
  const pathname = usePathname()
  const basePath = `/leagues/${leagueId}`

  const items = isCommissioner
    ? [...NAV_ITEMS, { label: 'Settings', path: '/settings' }]
    : NAV_ITEMS

  return (
    <nav className="bg-surface/30 border-b border-border sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {items.map(({ label, path }) => {
            const href = `${basePath}${path}`
            const isActive =
              path === ''
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname.startsWith(href)

            return (
              <Link
                key={path}
                href={href}
                className={`py-3 px-4 text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-text-primary border-b-2 border-brand font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
