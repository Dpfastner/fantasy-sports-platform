import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { BadgeAdminTable } from './BadgeAdminTable'
import type { BadgeDefinition, UserBadgeWithDefinition } from '@/types/database'

interface LeagueRow {
  id: string
  created_by: string
  profiles: { email: string; display_name: string | null } | null
}

interface MemberCountRow {
  league_id: string
}

interface DraftRow {
  league_id: string
  status: string
}

interface CommissionerData {
  userId: string
  email: string
  displayName: string | null
  leagueCount: number
  totalMembers: number
  draftsCompleted: number
  meetsThreshold: boolean
  badges: UserBadgeWithDefinition[]
}

export default async function BadgesAdminPage() {
  const supabase = createAdminClient()

  const [
    leaguesResult,
    membersResult,
    draftsResult,
    badgeDefsResult,
  ] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, created_by, profiles(email, display_name)'),
    supabase
      .from('league_members')
      .select('league_id'),
    supabase
      .from('drafts')
      .select('league_id, status'),
    supabase
      .from('badge_definitions')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  const leagues = (leaguesResult.data || []) as unknown as LeagueRow[]
  const allMembers = (membersResult.data || []) as unknown as MemberCountRow[]
  const allDrafts = (draftsResult.data || []) as unknown as DraftRow[]
  const badgeDefinitions = (badgeDefsResult.data || []) as BadgeDefinition[]

  // Count members per league
  const memberCounts = new Map<string, number>()
  for (const m of allMembers) {
    memberCounts.set(m.league_id, (memberCounts.get(m.league_id) || 0) + 1)
  }

  // Track completed drafts per league
  const completedDrafts = new Set<string>()
  for (const d of allDrafts) {
    if (d.status === 'completed') completedDrafts.add(d.league_id)
  }

  // Build commissioner data
  const commissionerMap = new Map<string, {
    email: string
    displayName: string | null
    leagueCount: number
    totalMembers: number
    draftsCompleted: number
    meetsThreshold: boolean
  }>()

  for (const league of leagues) {
    const existing = commissionerMap.get(league.created_by)
    const leagueMembers = memberCounts.get(league.id) || 0
    const draftDone = completedDrafts.has(league.id) ? 1 : 0

    if (existing) {
      existing.leagueCount++
      existing.totalMembers += leagueMembers
      existing.draftsCompleted += draftDone
      if (leagueMembers >= 6 && draftDone > 0) existing.meetsThreshold = true
    } else {
      commissionerMap.set(league.created_by, {
        email: league.profiles?.email || 'Unknown',
        displayName: league.profiles?.display_name || null,
        leagueCount: 1,
        totalMembers: leagueMembers,
        draftsCompleted: draftDone,
        meetsThreshold: leagueMembers >= 6 && draftDone > 0,
      })
    }
  }

  // Fetch badges for all commissioners
  const commissionerIds = [...commissionerMap.keys()]
  const { data: allBadges } = commissionerIds.length > 0
    ? await supabase
        .from('user_badges')
        .select('id, user_id, badge_definition_id, metadata, granted_at, badge_definitions(*)')
        .in('user_id', commissionerIds)
        .is('revoked_at', null)
    : { data: [] }

  const badgesByUser = new Map<string, UserBadgeWithDefinition[]>()
  for (const badge of (allBadges || [])) {
    const typed = badge as unknown as UserBadgeWithDefinition
    const existing = badgesByUser.get(typed.user_id) || []
    existing.push(typed)
    badgesByUser.set(typed.user_id, existing)
  }

  const commissioners: CommissionerData[] = [...commissionerMap.entries()]
    .map(([userId, data]) => ({
      userId,
      ...data,
      badges: badgesByUser.get(userId) || [],
    }))
    .sort((a, b) => b.totalMembers - a.totalMembers)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin/sync" className="text-text-secondary hover:text-text-primary">
              Data Sync
            </Link>
            <Link href="/admin/reports" className="text-text-secondary hover:text-text-primary">
              Reports
            </Link>
            <Link href="/admin/analytics" className="text-text-secondary hover:text-text-primary">
              Analytics
            </Link>
            <span className="text-text-primary font-medium">Badges</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Management</h1>
        <p className="text-text-secondary mb-8">
          Manage badge definitions and grant/revoke badges for users.
        </p>

        {/* Badge Definitions */}
        <div className="bg-surface rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Badge Definitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {badgeDefinitions.map((def) => (
              <div key={def.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold"
                    style={{ backgroundColor: def.bg_color, color: def.color }}
                  >
                    {def.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={def.icon_url} alt="" className="w-4 h-4" />
                    ) : (
                      <span className="w-4 h-4 text-xs">{def.fallback_icon === 'trophy' ? '\u{1F3C6}' : def.fallback_icon === 'medal' ? '\u{1F3C5}' : '\u2B50'}</span>
                    )}
                    {def.label}
                  </span>
                </div>
                <p className="text-text-secondary text-sm mb-1">{def.description}</p>
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <span>Category: {def.category}</span>
                  <span>|</span>
                  <span>Slug: {def.slug}</span>
                </div>
                {def.requires_metadata && (
                  <span className="mt-1 inline-block text-xs text-warning">Requires metadata</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Commissioner Table with Badge Grant/Revoke */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Commissioners</h2>
          <p className="text-text-secondary text-sm mb-4">
            Grant Founding Commissioner status to qualifying commissioners. Criteria: created a league with 6+ members and a completed draft.
          </p>
          <BadgeAdminTable
            commissioners={commissioners}
            badgeDefinitions={badgeDefinitions}
          />
        </div>
      </main>
    </div>
  )
}
