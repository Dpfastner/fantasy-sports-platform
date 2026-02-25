import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verify the requesting user is authenticated.
 * Returns the user and supabase client, or a 401 Response.
 */
export async function requireAuth(): Promise<
  { user: { id: string; email?: string }; supabase: SupabaseClient } | NextResponse
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { user, supabase }
}

/**
 * Verify a user is a member of a specific league.
 * Uses admin client to bypass RLS for the membership check.
 */
export async function verifyLeagueMembership(
  userId: string,
  leagueId: string
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('league_members')
    .select('id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .single()

  return !error && !!data
}
