/**
 * Auto-grant badge logic.
 * Called from API routes and webhooks when badge-triggering events occur.
 * Each function is idempotent — safe to call multiple times.
 */

import { createAdminClient } from '@/lib/supabase/server'

/**
 * Grant Founding Commissioner badge if user doesn't already have it.
 * Triggered when a user creates their first league or event pool in 2026.
 */
export async function autoGrantFoundingCommissioner(userId: string) {
  const admin = createAdminClient()

  // Check if they already have it
  const { data: badgeDef } = await admin
    .from('badge_definitions')
    .select('id')
    .eq('slug', 'founding_commissioner')
    .single()

  if (!badgeDef) return

  const { data: existing } = await admin
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_definition_id', badgeDef.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (existing) return // Already has it

  const { data: newBadge } = await admin
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_definition_id: badgeDef.id,
      metadata: {},
      source: 'auto_signup_backfill',
    })
    .select('id')
    .single()

  if (newBadge) {
    // Send celebration notification
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'badge_awarded',
      title: 'You earned a badge!',
      body: 'Founding Commissioner — Original Rivyls commissioner from Year 1',
      data: { badgeId: newBadge.id },
    })
  }
}

/**
 * Grant Supporter badge on confirmed Stripe payment.
 * Triggered from Stripe webhook on checkout.session.completed.
 */
export async function autoGrantSupporter(userId: string) {
  const admin = createAdminClient()

  const { data: badgeDef } = await admin
    .from('badge_definitions')
    .select('id')
    .eq('slug', 'supporter')
    .single()

  if (!badgeDef) return

  const { data: existing } = await admin
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_definition_id', badgeDef.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (existing) return

  const { data: newBadge } = await admin
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_definition_id: badgeDef.id,
      metadata: {},
      source: 'auto_signup_backfill',
    })
    .select('id')
    .single()

  if (newBadge) {
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'badge_awarded',
      title: 'You earned a badge!',
      body: 'Supporter — Thank you for supporting Rivyls!',
      data: { badgeId: newBadge.id },
    })
  }
}

/**
 * Grant champion badges when a tournament is fully completed.
 * Only triggers when ALL games are completed and a clear winner exists.
 * Grants both event-specific champion (e.g., Frozen Four Champion)
 * and First Rivyls Champion (2026 only, first winner of any competition).
 */
export async function autoGrantChampionBadges(tournamentId: string) {
  const admin = createAdminClient()

  // Verify ALL games in tournament are completed
  const { data: games } = await admin
    .from('event_games')
    .select('id, status, winner_id, round')
    .eq('tournament_id', tournamentId)

  if (!games?.length) return

  const allCompleted = games.every(g => g.status === 'completed')
  if (!allCompleted) return

  // Get tournament info
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id, name, sport, slug')
    .eq('id', tournamentId)
    .single()

  if (!tournament) return

  // Get all pools for this tournament
  const { data: pools } = await admin
    .from('event_pools')
    .select('id, name')
    .eq('tournament_id', tournamentId)

  if (!pools?.length) return

  // For each pool, find the winner (highest total_points)
  for (const pool of pools) {
    const { data: topEntry } = await admin
      .from('event_entries')
      .select('id, user_id, total_points, display_name')
      .eq('pool_id', pool.id)
      .order('total_points', { ascending: false })
      .limit(1)
      .single()

    if (!topEntry?.user_id) continue

    // Check for ties — if top 2 have same score, don't award yet
    const { data: entries } = await admin
      .from('event_entries')
      .select('total_points')
      .eq('pool_id', pool.id)
      .order('total_points', { ascending: false })
      .limit(2)

    if (entries && entries.length >= 2 && entries[0].total_points === entries[1].total_points) {
      // Tie — don't auto-award. Admin needs to resolve tiebreaker manually.
      continue
    }

    const winnerId = topEntry.user_id

    // Grant event-specific champion badge (e.g., frozen_four_champion)
    if (tournament.sport === 'hockey' && tournament.slug?.includes('frozen-four')) {
      await grantBadgeIfNotExists(admin, winnerId, 'frozen_four_champion', {
        year: new Date().getFullYear().toString(),
        competition_name: pool.name,
        tournament: tournament.name,
      })
    }

    // Masters Champion — Green Jacket
    if (tournament.sport === 'golf' && tournament.slug?.startsWith('masters')) {
      await grantBadgeIfNotExists(admin, winnerId, 'masters_champion', {
        year: new Date().getFullYear().toString(),
        competition_name: pool.name,
        tournament: tournament.name,
      })
    }

    // Grant First Rivyls Champion (2026 only)
    const currentYear = new Date().getFullYear()
    if (currentYear === 2026) {
      await grantBadgeIfNotExists(admin, winnerId, 'first_rivyls_champion', {})
    }
  }

  // Mark tournament as completed
  await admin
    .from('event_tournaments')
    .update({ status: 'completed' })
    .eq('id', tournamentId)
}

/** Helper: grant a badge if user doesn't already have it (for non-metadata badges) or always (for metadata badges) */
async function grantBadgeIfNotExists(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  badgeSlug: string,
  metadata: Record<string, unknown>
) {
  const { data: badgeDef } = await admin
    .from('badge_definitions')
    .select('id, label, description, requires_metadata')
    .eq('slug', badgeSlug)
    .single()

  if (!badgeDef) return

  // For non-metadata badges, check if already granted
  if (!badgeDef.requires_metadata) {
    const { data: existing } = await admin
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_definition_id', badgeDef.id)
      .is('revoked_at', null)
      .maybeSingle()

    if (existing) return
  }

  const { data: newBadge } = await admin
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_definition_id: badgeDef.id,
      metadata,
      source: 'auto_signup_backfill',
    })
    .select('id')
    .single()

  if (newBadge) {
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'badge_awarded',
      title: 'You earned a badge!',
      body: `${badgeDef.label} — ${badgeDef.description}`,
      data: { badgeId: newBadge.id },
    })
  }
}

/**
 * Grant Augusta Patron badge when a user joins a Masters pool.
 * The waiting list for real Augusta badges closed in 1978.
 */
export async function autoGrantMastersPatron(userId: string) {
  const admin = createAdminClient()
  await grantBadgeIfNotExists(admin, userId, 'masters_patron', {
    year: new Date().getFullYear().toString(),
  })
}
