'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Home', exact: true },
  { href: '/admin/sync', label: 'Data Sync' },
  { href: '/admin/badges', label: 'Badges' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/reports', label: 'Reports' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="bg-surface/50 border-b border-border">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
          Rivyls
        </Link>
        <div className="flex items-center gap-4">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return isActive ? (
              <span key={item.href} className="text-text-primary font-medium">
                {item.label}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-text-secondary hover:text-text-primary transition-colors"
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
