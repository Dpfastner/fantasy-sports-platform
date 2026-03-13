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
  const metric = searchParams.get('metric')
  const period = searchParams.get('period') || '7d'

  if (!metric) {
    return NextResponse.json({ error: 'metric is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const cutoff = PERIODS[period]
    ? new Date(Date.now() - PERIODS[period]).toISOString()
    : null

  try {
    const result = await fetchMetricData(admin, metric, cutoff)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchMetricData(admin: any, metric: string, cutoff: string | null) {
  switch (metric) {
    case 'total_users': {
      let q = admin.from('profiles').select('id, display_name, email, created_at').order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q.select('id, display_name, email, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
      return { rows: data || [], count, columns: ['display_name', 'email', 'created_at'] }
    }

    case 'total_leagues': {
      let q = admin.from('leagues').select('id, name, created_at, created_by, profiles!leagues_created_by_fkey(display_name, email)', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      const rows = (data || []).map((l: Record<string, unknown>) => {
        const p = l.profiles as { display_name: string | null; email: string } | null
        return { name: l.name, created_by: p?.display_name || p?.email || 'Unknown', created_at: l.created_at }
      })
      return { rows, count, columns: ['name', 'created_by', 'created_at'] }
    }

    case 'active_users': {
      const since = cutoff || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await admin.from('activity_log').select('user_id, action, created_at').gte('created_at', since).not('user_id', 'is', null).order('created_at', { ascending: false }).limit(1000)
      // Aggregate by user
      const userMap = new Map<string, { action_count: number; last_action: string; last_at: string }>()
      for (const row of (data || [])) {
        const existing = userMap.get(row.user_id)
        if (existing) {
          existing.action_count++
        } else {
          userMap.set(row.user_id, { action_count: 1, last_action: row.action, last_at: row.created_at })
        }
      }
      // Fetch profiles
      const userIds = [...userMap.keys()]
      let profileMap: Record<string, { display_name: string | null; email: string }> = {}
      if (userIds.length > 0) {
        const { data: profiles } = await admin.from('profiles').select('id, display_name, email').in('id', userIds)
        for (const p of (profiles || [])) profileMap[p.id] = p
      }
      const rows = userIds.map(uid => ({
        display_name: profileMap[uid]?.display_name || 'Unknown',
        email: profileMap[uid]?.email || '',
        action_count: userMap.get(uid)!.action_count,
        last_action: userMap.get(uid)!.last_action,
        last_at: userMap.get(uid)!.last_at,
      })).sort((a, b) => b.action_count - a.action_count)
      return { rows, count: rows.length, columns: ['display_name', 'email', 'action_count', 'last_action', 'last_at'] }
    }

    case 'total_transactions': {
      let q = admin.from('transactions').select('id, type, created_at, user_id, league_id', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      return { rows: data || [], count, columns: ['type', 'user_id', 'league_id', 'created_at'] }
    }

    case 'drafts': {
      let q = admin.from('drafts').select('id, status, started_at, completed_at, league_id, leagues(name)', { count: 'exact' }).order('started_at', { ascending: false, nullsFirst: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      const rows = (data || []).map((d: Record<string, unknown>) => {
        const league = d.leagues as { name: string } | null
        return { league_name: league?.name || 'Unknown', status: d.status, started_at: d.started_at, completed_at: d.completed_at }
      })
      return { rows, count, columns: ['league_name', 'status', 'started_at', 'completed_at'] }
    }

    case 'waitlist': {
      let q = admin.from('waitlist').select('id, email, source, created_at, converted_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      return { rows: data || [], count, columns: ['email', 'source', 'created_at', 'converted_at'] }
    }

    case 'referrals': {
      let q = admin.from('profiles').select('id, display_name, email, referred_by, created_at', { count: 'exact' }).not('referred_by', 'is', null).order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      return { rows: data || [], count, columns: ['display_name', 'email', 'referred_by', 'created_at'] }
    }

    case 'event_pools': {
      let q = admin.from('event_pools').select('id, name, visibility, status, created_at, game_type, event_tournaments(name, format)', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      const rows = (data || []).map((p: Record<string, unknown>) => {
        const t = p.event_tournaments as { name: string; format: string } | null
        return { name: p.name, tournament: t?.name || 'Unknown', format: p.game_type || t?.format || '', visibility: p.visibility, status: p.status, created_at: p.created_at }
      })
      return { rows, count, columns: ['name', 'tournament', 'format', 'visibility', 'status', 'created_at'] }
    }

    case 'event_entries': {
      let q = admin.from('event_entries').select('id, user_id, display_name, submitted_at, total_points, created_at, event_pools(name)', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('created_at', cutoff)
      const { data, count } = await q
      const rows = (data || []).map((e: Record<string, unknown>) => {
        const pool = e.event_pools as { name: string } | null
        return { display_name: e.display_name || 'Anonymous', pool_name: pool?.name || 'Unknown', submitted_at: e.submitted_at, total_points: e.total_points, created_at: e.created_at }
      })
      return { rows, count, columns: ['display_name', 'pool_name', 'submitted_at', 'total_points', 'created_at'] }
    }

    case 'event_picks': {
      let q = admin.from('event_picks').select('id, entry_id, participant_id, picked_at', { count: 'exact' }).order('picked_at', { ascending: false }).limit(200)
      if (cutoff) q = q.gte('picked_at', cutoff)
      const { data, count } = await q
      return { rows: data || [], count, columns: ['entry_id', 'participant_id', 'picked_at'] }
    }

    case 'favorite_schools': {
      const { data } = await admin.from('profiles').select('favorite_school_id').not('favorite_school_id', 'is', null)
      // Count by school
      const schoolCounts: Record<string, number> = {}
      for (const row of (data || [])) {
        const sid = (row as { favorite_school_id: string }).favorite_school_id
        schoolCounts[sid] = (schoolCounts[sid] || 0) + 1
      }
      // Fetch school names
      const schoolIds = Object.keys(schoolCounts)
      let schoolNames: Record<string, string> = {}
      if (schoolIds.length > 0) {
        const { data: schools } = await admin.from('schools').select('id, name').in('id', schoolIds)
        for (const s of (schools || [])) schoolNames[s.id] = s.name
      }
      const rows = Object.entries(schoolCounts)
        .map(([id, count]) => ({ school: schoolNames[id] || id, fans: count }))
        .sort((a, b) => b.fans - a.fans)
      return { rows, count: rows.length, columns: ['school', 'fans'] }
    }

    default:
      throw new Error(`Unknown metric: ${metric}`)
  }
}
