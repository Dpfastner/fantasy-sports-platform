import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'

const PERIODS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'all'
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''

  const admin = createAdminClient()
  const cutoff = PERIODS[period]
    ? new Date(Date.now() - PERIODS[period]).toISOString()
    : null

  // Fetch profiles
  let profileQuery = admin.from('profiles').select('id, display_name, email, created_at, referred_by').order('created_at', { ascending: false }).limit(500)
  if (cutoff) profileQuery = profileQuery.gte('created_at', cutoff)
  if (search) {
    profileQuery = profileQuery.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: profiles } = await profileQuery

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ users: [] })
  }

  const userIds = profiles.map(p => p.id)

  // Fetch all data in parallel
  const [leagueMembersResult, eventEntriesResult, lastActivityResult, badgesResult, leaguesResult, poolsResult] = await Promise.all([
    admin.from('league_members').select('user_id').in('user_id', userIds),
    admin.from('event_entries').select('user_id').in('user_id', userIds).not('user_id', 'is', null),
    admin.from('activity_log').select('user_id, created_at').in('user_id', userIds).order('created_at', { ascending: false }).limit(1000),
    admin.from('user_badges').select('id, user_id, badge_definition_id, metadata, granted_at, badge_definitions(slug, label, color, bg_color, fallback_icon)').in('user_id', userIds).is('revoked_at', null),
    admin.from('leagues').select('created_by').in('created_by', userIds),
    admin.from('event_pools').select('created_by').in('created_by', userIds),
  ])

  const leagueCounts: Record<string, number> = {}
  for (const m of (leagueMembersResult.data || [])) {
    leagueCounts[m.user_id] = (leagueCounts[m.user_id] || 0) + 1
  }

  const entryCounts: Record<string, number> = {}
  for (const e of (eventEntriesResult.data || [])) {
    if (e.user_id) entryCounts[e.user_id] = (entryCounts[e.user_id] || 0) + 1
  }

  const lastActiveMap: Record<string, string> = {}
  for (const a of (lastActivityResult.data || [])) {
    if (a.user_id && !lastActiveMap[a.user_id]) {
      lastActiveMap[a.user_id] = a.created_at
    }
  }

  // Build badges map
  const badgesMap: Record<string, Array<{ id: string; slug: string; label: string; color: string; bg_color: string; fallback_icon: string }>> = {}
  for (const b of (badgesResult.data || []) as unknown as { id: string; user_id: string; badge_definitions: { slug: string; label: string; color: string; bg_color: string; fallback_icon: string } | null }[]) {
    if (!b.badge_definitions) continue
    if (!badgesMap[b.user_id]) badgesMap[b.user_id] = []
    badgesMap[b.user_id].push({
      id: b.id,
      slug: b.badge_definitions.slug,
      label: b.badge_definitions.label,
      color: b.badge_definitions.color,
      bg_color: b.badge_definitions.bg_color,
      fallback_icon: b.badge_definitions.fallback_icon,
    })
  }

  // Build role flags
  const commissionerIds = new Set((leaguesResult.data || []).map((l: { created_by: string }) => l.created_by))
  const creatorIds = new Set((poolsResult.data || []).map((p: { created_by: string }) => p.created_by))

  let users = profiles.map(p => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    created_at: p.created_at,
    league_count: leagueCounts[p.id] || 0,
    entry_count: entryCounts[p.id] || 0,
    last_active: lastActiveMap[p.id] || null,
    referred_by: p.referred_by,
    is_commissioner: commissionerIds.has(p.id),
    is_pool_creator: creatorIds.has(p.id),
    badges: badgesMap[p.id] || [],
  }))

  // Apply role filter
  if (role === 'commissioner') {
    users = users.filter(u => u.is_commissioner)
  } else if (role === 'creator') {
    users = users.filter(u => u.is_pool_creator)
  } else if (role === 'has_badge') {
    users = users.filter(u => u.badges.length > 0)
  } else if (role === 'no_badge') {
    users = users.filter(u => u.badges.length === 0)
  }

  return NextResponse.json({ users })
}
