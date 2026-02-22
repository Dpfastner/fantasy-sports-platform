'use client'

import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

interface HeaderProps {
  userName?: string | null
  userEmail?: string | null
  showUserMenu?: boolean
  children?: React.ReactNode
}

export function Header({ userName, userEmail, showUserMenu = true, children }: HeaderProps) {
  const displayName = userName || userEmail || 'User'

  return (
    <header className="bg-gray-800/50 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold text-white">
          Rivyls
        </Link>
        <div className="flex items-center gap-4">
          {children}
          {showUserMenu && (
            <>
              <Link
                href="/settings"
                className="text-gray-300 hover:text-white transition-colors"
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
