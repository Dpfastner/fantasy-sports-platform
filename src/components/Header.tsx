'use client'

import Link from 'next/link'
import { LogoutButton } from './LogoutButton'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  userName?: string | null
  userEmail?: string | null
  userId?: string | null
  showUserMenu?: boolean
  children?: React.ReactNode
}

export function Header({ userName, userEmail, userId, showUserMenu = true, children }: HeaderProps) {
  const displayName = userName || userEmail || 'User'

  return (
    <header className="bg-surface/50 border-b border-border">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
          Rivyls
        </Link>
        <div className="flex items-center gap-4">
          {children}
          {showUserMenu && (
            <>
              {userId && <NotificationBell userId={userId} />}
              <Link
                href="/profile"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                {displayName}
              </Link>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
