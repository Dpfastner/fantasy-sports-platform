'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useConfirm } from './ConfirmDialog'
import { NotificationBell } from './NotificationBell'
import { useLeagueContext } from '@/contexts/LeagueContext'
import { useChatContext } from '@/contexts/ChatContext'
import { HeaderSchoolBadge } from './HeaderSchoolBadge'
import { LeagueDropdown } from './header/LeagueDropdown'
import { TeamDropdown } from './header/TeamDropdown'

interface HeaderProps {
  userName?: string | null
  userEmail?: string | null
  userId?: string | null
  showUserMenu?: boolean
}

export function Header({ userName, userEmail, userId, showUserMenu = true }: HeaderProps) {
  const displayName = userName || userEmail || 'User'
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const { confirm } = useConfirm()
  const leagueCtx = useLeagueContext()
  const chatCtx = useChatContext()

  // Set --header-h CSS variable so sidebar aligns below header
  // Uses ResizeObserver so it updates when HeaderSchoolBadge loads async
  useEffect(() => {
    if (!headerRef.current) return
    const update = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty('--header-h', `${headerRef.current.offsetHeight}px`)
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [])

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
    const ok = await confirm({ title: 'Sign out?', message: 'Are you sure you want to sign out?' })
    if (!ok) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header ref={headerRef} className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href="/dashboard" className="text-2xl font-bold text-text-primary shrink-0">
          Rivyls
        </Link>

        {/* Right: League/Team dropdowns + Notification bell + Profile dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* League/Team dropdowns (right-aligned, desktop only) */}
          {leagueCtx && (
            <div className="hidden sm:flex items-center gap-1">
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
          )}

          {userId && <HeaderSchoolBadge userId={userId} />}

          {showUserMenu && (
            <>
              {userId && chatCtx && (
                <button
                  onClick={() => chatCtx.setIsOpen(!chatCtx.isOpen)}
                  className="relative p-2 text-text-secondary hover:text-text-primary transition-colors hidden md:block"
                  title="Toggle chat"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {Object.values(chatCtx.unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand rounded-full" />
                  )}
                </button>
              )}
              {userId && <NotificationBell userId={userId} />}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors min-w-[44px] min-h-[44px] justify-center sm:min-w-0 sm:min-h-0"
                >
                  {/* Mobile: user initial circle */}
                  <span className="sm:hidden w-8 h-8 rounded-full bg-brand/20 text-brand-text text-sm font-semibold flex items-center justify-center shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  {/* Desktop: full name */}
                  <span className="text-sm hidden sm:inline">{displayName}</span>
                  <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

    </header>
  )
}
