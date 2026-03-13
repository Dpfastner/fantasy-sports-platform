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

  // Fetch league counts per user
  const { data: leagueMembers } = await admin
    .from('league_members')
    .select('user_id')
    .in('user_id', userIds)

  const leagueCounts: Record<string, number> = {}
  for (const m of (leagueMembers || [])) {
    leagueCounts[m.user_id] = (leagueCounts[m.user_id] || 0) + 1
  }

  // Fetch event entry counts per user
  const { data: eventEntries } = await admin
    .from('event_entries')
    .select('user_id')
    .in('user_id', userIds)
    .not('user_id', 'is', null)

  const entryCounts: Record<string, number> = {}
  for (const e of (eventEntries || [])) {
    if (e.user_id) entryCounts[e.user_id] = (entryCounts[e.user_id] || 0) + 1
  }

  // Fetch last activity per user (most recent from activity_log)
  const { data: lastActivity } = await admin
    .from('activity_log')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(1000)

  const lastActiveMap: Record<string, string> = {}
  for (const a of (lastActivity || [])) {
    if (a.user_id && !lastActiveMap[a.user_id]) {
      lastActiveMap[a.user_id] = a.created_at
    }
  }

  const users = profiles.map(p => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    created_at: p.created_at,
    league_count: leagueCounts[p.id] || 0,
    entry_count: entryCounts[p.id] || 0,
    last_active: lastActiveMap[p.id] || null,
    referred_by: p.referred_by,
  }))

  return NextResponse.json({ users })
}
