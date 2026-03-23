import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { leagueJoinSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { createNotification } from '@/lib/notifications'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

// POST /api/leagues/join
// Body: { inviteCode: string, teamName?: string }
// If teamName is omitted, returns league preview (lookup mode)
// If teamName is provided, joins the league and creates a team
export async function POST(request: Request) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!
  try {
    // Verify the user is authenticated
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You need to sign in to do this.' }, { status: 401 })
    }

    const rawBody = await request.json()
    const validation = validateBody(leagueJoinSchema, rawBody)
    if (!validation.success) return validation.response

    const { inviteCode, teamName } = validation.data
    const favoriteSchoolId = rawBody.favoriteSchoolId as string | undefined

    // Use admin client to bypass RLS for invite code lookup
    const admin = createAdminClient()

    // Look up league by invite code (no joins — avoids PostgREST .single() issues)
    const { data: league, error: lookupError } = await admin
      .from('leagues')
      .select('id, name, max_teams, sport_id, season_id')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()

    if (lookupError || !league) {
      console.error('League lookup failed:', lookupError?.message, 'code:', inviteCode.trim().toLowerCase())
      const isSandbox = process.env.NEXT_PUBLIC_ENVIRONMENT === 'sandbox'
      return NextResponse.json({
        error: 'League not found. Please check your invite code.',
        ...(isSandbox && {
          debug: {
            lookupError: lookupError?.message || null,
            lookupCode: lookupError?.code || null,
            searchedCode: inviteCode.trim().toLowerCase(),
            hasAdminUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAdminKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          },
        }),
      }, { status: 404 })
    }

    // Fetch related data separately
    const [sportResult, seasonResult, membersResult, settingsResult, draftResult] = await Promise.all([
      admin.from('sports').select('name').eq('id', league.sport_id).single(),
      admin.from('seasons').select('name').eq('id', league.season_id).single(),
      admin.from('league_members').select('id, user_id').eq('league_id', league.id),
      admin.from('league_settings').select('draft_date, scoring_preset, schools_per_team').eq('league_id', league.id).single(),
      admin.from('drafts').select('status').eq('league_id', league.id).order('created_at', { ascending: false }).limit(1),
    ])

    const members = membersResult.data || []

    // Check if user is already a member
    if (members.some(m => m.user_id === user.id)) {
      return NextResponse.json({ error: 'You are already a member of this league' }, { status: 409 })
    }

    // Lookup mode — return league preview
    if (!teamName) {
      const settings = settingsResult.data
      const drafts = draftResult.data || []
      const latestDraft = drafts[0]

      return NextResponse.json({
        success: true,
        league: {
          id: league.id,
          name: league.name,
          sport: sportResult.data?.name || 'Unknown',
          sportId: league.sport_id,
          season: seasonResult.data?.name || 'Unknown',
          memberCount: members.length,
          maxTeams: league.max_teams,
          draftDate: settings?.draft_date || null,
          draftCompleted: latestDraft?.status === 'completed',
          scoringPreset: settings?.scoring_preset || null,
          schoolsPerTeam: settings?.schools_per_team || 5,
        },
      })
    }

    // Join mode — Zod already validated teamName is 3+ chars
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
      return NextResponse.json({ error: 'Couldn\'t join the league. Try again.' }, { status: 500 })
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
      return NextResponse.json({ error: 'Couldn\'t create your team. Try again.' }, { status: 500 })
    }

    // Save sport favorite if provided
    if (favoriteSchoolId) {
      const { data: inserted } = await admin
        .from('user_sport_favorites')
        .upsert(
          { user_id: user.id, sport_id: league.sport_id, school_id: favoriteSchoolId },
          { onConflict: 'user_id,sport_id' }
        )
        .select('id')
        .single()

      // If user has no featured favorite yet, set this as featured + sync favorite_school_id
      if (inserted) {
        const { data: profile } = await admin
          .from('profiles')
          .select('featured_favorite_id')
          .eq('id', user.id)
          .single()

        if (!profile?.featured_favorite_id) {
          await admin
            .from('profiles')
            .update({ featured_favorite_id: inserted.id, favorite_school_id: favoriteSchoolId })
            .eq('id', user.id)
        }
      }
    }

    logActivity({
      userId: user.id,
      leagueId: league.id,
      action: 'league.joined',
      details: { teamName: teamName.trim(), inviteCode },
    })

    // Notify commissioner(s) that someone joined
    const { data: commissioners } = await admin
      .from('league_members')
      .select('user_id')
      .eq('league_id', league.id)
      .in('role', ['commissioner', 'co_commissioner'])

    for (const comm of commissioners || []) {
      createNotification({
        userId: comm.user_id,
        leagueId: league.id,
        type: 'league_joined',
        title: 'New Member Joined',
        body: `${teamName.trim()} joined ${league.name}`,
        data: { leagueId: league.id },
      })
    }

    return NextResponse.json({
      success: true,
      leagueId: league.id,
    })
  } catch (err) {
    Sentry.captureException(err)
    const isSandbox = process.env.NEXT_PUBLIC_ENVIRONMENT === 'sandbox'
    console.error('League join error:', err)
    return NextResponse.json({
      error: 'Something went wrong. Try again.',
      ...(isSandbox && { debug: { message: err instanceof Error ? err.message : String(err) } }),
    }, { status: 500 })
  }
}
