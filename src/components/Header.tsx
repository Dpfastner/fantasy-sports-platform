'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from './NotificationBell'
import { useLeagueContext } from '@/contexts/LeagueContext'
import { LeagueDropdown } from './header/LeagueDropdown'
import { TeamDropdown } from './header/TeamDropdown'
import { Breadcrumbs } from './header/Breadcrumbs'

interface HeaderProps {
  userName?: string | null
  userEmail?: string | null
  userId?: string | null
  showUserMenu?: boolean
  /** @deprecated Use LeagueContext instead — will be removed in a future release */
  children?: React.ReactNode
}

export function Header({ userName, userEmail, userId, showUserMenu = true, children }: HeaderProps) {
  const displayName = userName || userEmail || 'User'
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const leagueCtx = useLeagueContext()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [profileOpen])

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-surface/50 border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href="/dashboard" className="text-2xl font-bold text-text-primary shrink-0">
          Rivyls
        </Link>

        {/* Center: League/Team dropdowns (when in league context) or legacy children */}
        {leagueCtx ? (
          <div className="hidden sm:flex items-center gap-1 min-w-0">
            <LeagueDropdown
              currentLeague={leagueCtx.currentLeague}
              leagues={leagueCtx.userLeagues}
            />
            {leagueCtx.userTeam && (
              <TeamDropdown
                leagueId={leagueCtx.currentLeague.id}
                teams={leagueCtx.teamsInLeague}
                userTeam={leagueCtx.userTeam}
              />
            )}
          </div>
        ) : children ? (
          <div className="hidden sm:flex items-center gap-4">{children}</div>
        ) : null}

        {/* Right: Notification bell + Profile dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          {showUserMenu && (
            <>
              {userId && <NotificationBell userId={userId} />}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <span className="text-sm hidden sm:inline">{displayName}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
                    {/* Mobile-only: league/team links when dropdowns are hidden */}
                    {leagueCtx && (
                      <div className="sm:hidden">
                        <Link
                          href={`/leagues/${leagueCtx.currentLeague.id}`}
                          className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          {leagueCtx.currentLeague.name}
                        </Link>
                        {leagueCtx.userTeam && (
                          <Link
                            href={`/leagues/${leagueCtx.currentLeague.id}/team`}
                            className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                            onClick={() => setProfileOpen(false)}
                          >
                            My Team
                          </Link>
                        )}
                        <div className="border-t border-border my-1" />
                      </div>
                    )}
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      Settings
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumbs row (league pages only, desktop) */}
      {leagueCtx && (
        <div className="container mx-auto px-4 pb-2">
          <Breadcrumbs />
        </div>
      )}
    </header>
  )
}
