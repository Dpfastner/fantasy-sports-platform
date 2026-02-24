import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase configuration')
  return createClient(url, key)
}

// POST /api/leagues/join
// Body: { inviteCode: string, teamName?: string }
// If teamName is omitted, returns league preview (lookup mode)
// If teamName is provided, joins the league and creates a team
export async function POST(request: Request) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const { inviteCode, teamName } = body

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS for invite code lookup
    const admin = getSupabaseAdmin()

    // Look up league by invite code
    const { data: league, error: lookupError } = await admin
      .from('leagues')
      .select(`
        id,
        name,
        max_teams,
        sports (name),
        seasons (name),
        league_members (id, user_id)
      `)
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()

    if (lookupError || !league) {
      return NextResponse.json({ error: 'League not found. Please check your invite code.' }, { status: 404 })
    }

    const members = (league.league_members as { id: string; user_id: string }[]) || []

    // Check if user is already a member
    if (members.some(m => m.user_id === user.id)) {
      return NextResponse.json({ error: 'You are already a member of this league' }, { status: 409 })
    }

    // Lookup mode — return league preview
    if (!teamName) {
      return NextResponse.json({
        success: true,
        league: {
          id: league.id,
          name: league.name,
          sport: (league.sports as unknown as { name: string } | null)?.name || 'Unknown',
          season: (league.seasons as unknown as { name: string } | null)?.name || 'Unknown',
          memberCount: members.length,
          maxTeams: league.max_teams,
        },
      })
    }

    // Join mode — validate and join
    if (typeof teamName !== 'string' || teamName.trim().length < 3) {
      return NextResponse.json({ error: 'Team name must be at least 3 characters' }, { status: 400 })
    }

    if (members.length >= league.max_teams) {
      return NextResponse.json({ error: 'This league is full' }, { status: 409 })
    }

    // Add user as league member
    const { error: memberError } = await admin
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      if (memberError.code === '23505') {
        return NextResponse.json({ error: 'You are already a member of this league' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to join league' }, { status: 500 })
    }

    // Create fantasy team
    const { error: teamError } = await admin
      .from('fantasy_teams')
      .insert({
        league_id: league.id,
        user_id: user.id,
        name: teamName.trim(),
      })

    if (teamError) {
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      leagueId: league.id,
    })
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
