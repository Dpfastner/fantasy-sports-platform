'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Home', exact: true },
  { href: '/admin/sync', label: 'Data Sync' },
  { href: '/admin/badges', label: 'Badges' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/scores', label: 'Scores' },
  { href: '/admin/monitoring', label: 'Monitoring' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="bg-surface/50 border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <Link href="/dashboard" className="text-xl font-bold text-text-primary">
            Rivyls
          </Link>
          <span className="text-xs text-text-muted">Admin</span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide whitespace-nowrap -mx-4 px-4">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return isActive ? (
              <span key={item.href} className="text-text-primary font-medium text-sm shrink-0">
                {item.label}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-text-secondary hover:text-text-primary transition-colors text-sm shrink-0"
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
