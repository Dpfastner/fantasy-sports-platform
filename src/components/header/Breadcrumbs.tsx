'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLeagueContext } from '@/contexts/LeagueContext'

const SEGMENT_LABELS: Record<string, string> = {
  team: 'My Team',
  schedule: 'Schedule',
  stats: 'Standings',
  transactions: 'Add/Drop',
  bracket: 'Bracket',
  history: 'History',
  settings: 'Settings',
  draft: 'Draft',
  edit: 'Edit',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const leagueCtx = useLeagueContext()

  if (!leagueCtx) return null

  // Parse: /leagues/{id}/team/edit -> ['leagues', '{id}', 'team', 'edit']
  const segments = pathname.split('/').filter(Boolean)

  const crumbs: { label: string; href: string }[] = [
    { label: 'Dashboard', href: '/dashboard' },
  ]

  if (segments.length >= 2) {
    crumbs.push({
      label: leagueCtx.currentLeague.name,
      href: `/leagues/${leagueCtx.currentLeague.id}`,
    })
  }

  if (segments.length >= 3) {
    const subPage = segments[2]
    const label = SEGMENT_LABELS[subPage] || subPage
    crumbs.push({
      label,
      href: `/leagues/${leagueCtx.currentLeague.id}/${subPage}`,
    })
  }

  // Handle deeper paths like /team/edit or /team/[teamId]
  if (segments.length >= 4) {
    const deepPage = segments[3]
    const label = SEGMENT_LABELS[deepPage] || null
    if (label) {
      crumbs.push({ label, href: pathname })
    }
  }

  // Only show if we have more than just "Dashboard"
  if (crumbs.length <= 1) return null

  return (
    <nav className="hidden md:flex items-center gap-1.5 text-xs text-text-secondary">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-text-muted">/</span>}
          {i === crumbs.length - 1 ? (
            <span className="text-text-primary font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-text-primary transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
