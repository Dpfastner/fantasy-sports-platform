/**
 * Feature flag checking utility.
 *
 * Year 1: Everything is free — all features return true.
 * Year 2: Uncomment the implementation below to gate features
 * by user tier, badge status, and individual overrides.
 *
 * Model:
 * - tier ('free' | 'pro') = subscription level (what you pay for)
 * - Badges (user_badges table) = separate distinctions
 *   Users with 'founding_commissioner' badge get all Pro features for free.
 *   Additional badge-based perks can be added in this same pattern.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function hasFeature(_userId: string, _featureKey: string): Promise<boolean> {
  // Year 1: everything is free for all users
  return true

  // Year 2 implementation:
  // const supabase = createAdminClient()
  //
  // // 1. Check for individual override
  // const { data: override } = await supabase
  //   .from('user_feature_flags')
  //   .select('enabled, expires_at')
  //   .eq('user_id', userId)
  //   .eq('feature_flag_id', featureKey)
  //   .maybeSingle()
  //
  // if (override) {
  //   if (override.expires_at && new Date(override.expires_at) < new Date()) {
  //     // Override expired, fall through to tier check
  //   } else {
  //     return override.enabled
  //   }
  // }
  //
  // // 2. Check feature flag requirements
  // const { data: flag } = await supabase
  //   .from('feature_flags')
  //   .select('tier_required, enabled')
  //   .eq('key', featureKey)
  //   .single()
  //
  // if (!flag || !flag.enabled) return false
  //
  // // 3. Check user's tier and badges
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('tier')
  //   .eq('id', userId)
  //   .single()
  //
  // if (!profile) return false
  //
  // // 4. Founding commissioners get all Pro features for free
  // const { data: fcBadge } = await supabase
  //   .from('user_badges')
  //   .select('id, badge_definitions!inner(slug)')
  //   .eq('user_id', userId)
  //   .eq('badge_definitions.slug', 'founding_commissioner')
  //   .is('revoked_at', null)
  //   .maybeSingle()
  //
  // if (fcBadge) return true
  //
  // // 5. Otherwise check subscription tier
  // if (flag.tier_required === 'free') return true
  // if (flag.tier_required === 'pro') return profile.tier === 'pro'
  //
  // return false
}
