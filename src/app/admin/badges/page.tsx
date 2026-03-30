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

interface PoolRow {
  id: string
  created_by: string
  name: string
}

interface CommissionerData {
  userId: string
  email: string
  displayName: string | null
  leagueCount: number
  poolCount: number
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
    poolsResult,
    poolEntriesResult,
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
    supabase
      .from('event_pools')
      .select('id, created_by, name'),
    supabase
      .from('event_entries')
      .select('pool_id, user_id'),
  ])

  const leagues = (leaguesResult.data || []) as unknown as LeagueRow[]
  const allMembers = (membersResult.data || []) as unknown as MemberCountRow[]
  const allDrafts = (draftsResult.data || []) as unknown as DraftRow[]
  const badgeDefinitions = (badgeDefsResult.data || []) as BadgeDefinition[]
  const pools = (poolsResult.data || []) as unknown as PoolRow[]
  const poolEntries = (poolEntriesResult.data || []) as { pool_id: string; user_id: string }[]

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

  // Count unique members per pool
  const poolMemberCounts = new Map<string, number>()
  const poolUserSets = new Map<string, Set<string>>()
  for (const e of poolEntries) {
    if (!poolUserSets.has(e.pool_id)) poolUserSets.set(e.pool_id, new Set())
    poolUserSets.get(e.pool_id)!.add(e.user_id)
  }
  for (const [poolId, users] of poolUserSets) {
    poolMemberCounts.set(poolId, users.size)
  }

  // Build competition leader data (commissioners + pool creators)
  const commissionerMap = new Map<string, {
    email: string
    displayName: string | null
    leagueCount: number
    poolCount: number
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
        poolCount: 0,
        totalMembers: leagueMembers,
        draftsCompleted: draftDone,
        meetsThreshold: leagueMembers >= 6 && draftDone > 0,
      })
    }
  }

  // Add pool creators
  for (const pool of pools) {
    const poolMembers = poolMemberCounts.get(pool.id) || 0
    const existing = commissionerMap.get(pool.created_by)

    if (existing) {
      existing.poolCount++
      existing.totalMembers += poolMembers
    } else {
      // Pool creator who isn't a league commissioner — need their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', pool.created_by)
        .single()

      commissionerMap.set(pool.created_by, {
        email: profile?.email || 'Unknown',
        displayName: profile?.display_name || null,
        leagueCount: 0,
        poolCount: 1,
        totalMembers: poolMembers,
        draftsCompleted: 0,
        meetsThreshold: false,
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
    .sort((a, b) => (b.leagueCount + b.poolCount) - (a.leagueCount + a.poolCount) || b.totalMembers - a.totalMembers)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Management</h1>
        <p className="text-text-secondary mb-8">
          Manage badge definitions and grant/revoke badges for users.
        </p>

        {/* Badge Definitions */}
        <div className="bg-surface rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Badge Definitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {badgeDefinitions.map((def) => {
              const iconChar = def.fallback_icon === 'trophy' ? '\u{1F3C6}' : def.fallback_icon === 'medal' ? '\u{1F3C5}' : def.fallback_icon === 'flag' ? '\u{1F6A9}' : def.fallback_icon === 'crown' ? '\u{1F451}' : '\u2B50'
              return (
                <div key={def.id} className="border border-border rounded-lg p-4">
                  {/* Badge preview */}
                  <div className="flex justify-center mb-3">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2"
                      style={{ borderColor: def.color, backgroundColor: def.bg_color }}
                    >
                      {def.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={def.icon_url} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <span className="text-3xl">{iconChar}</span>
                      )}
                    </div>
                  </div>
                  {/* Pill */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold"
                      style={{ backgroundColor: def.bg_color, color: def.color }}
                    >
                      <span className="w-4 h-4 text-xs">{def.icon_url ? '' : iconChar}</span>
                      {def.label}
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm mb-1 text-center">{def.description}</p>
                  <div className="flex items-center justify-center gap-2 text-text-muted text-xs">
                    <span>{def.category}</span>
                    <span>|</span>
                    <span>{def.slug}</span>
                  </div>
                  {def.requires_metadata && (
                    <div className="text-center mt-1">
                      <span className="text-xs text-warning">Requires metadata</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Commissioner Table with Badge Grant/Revoke */}
        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Competition Leaders</h2>
          <p className="text-text-secondary text-sm mb-4">
            League commissioners and pool creators. Grant badges to qualifying leaders.
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
