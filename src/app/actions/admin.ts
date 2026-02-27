'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

const ADMIN_USER_IDS = [
  '5ab25825-1e29-4949-b798-61a8724170d6',
]

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || !ADMIN_USER_IDS.includes(user.id)) {
    return { error: 'Unauthorized' }
  }

  return { userId: user.id }
}

export async function grantBadge(
  targetUserId: string,
  badgeSlug: string,
  metadata?: Record<string, unknown>
): Promise<{ success?: boolean; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createAdminClient()

  // Look up badge definition
  const { data: badgeDef, error: defError } = await supabase
    .from('badge_definitions')
    .select('id, slug, requires_metadata')
    .eq('slug', badgeSlug)
    .single()

  if (defError || !badgeDef) return { error: 'Badge type not found' }

  // For non-metadata badges, check if already granted
  if (!badgeDef.requires_metadata) {
    const { data: existing } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('badge_definition_id', badgeDef.id)
      .is('revoked_at', null)
      .maybeSingle()

    if (existing) return { error: 'User already has this badge' }
  }

  const { error } = await supabase
    .from('user_badges')
    .insert({
      user_id: targetUserId,
      badge_definition_id: badgeDef.id,
      metadata: metadata || {},
      granted_by: auth.userId,
      source: 'manual',
    })

  if (error) return { error: error.message }

  logActivity({
    userId: auth.userId,
    action: 'badge.granted',
    details: { targetUserId, badgeSlug, metadata },
  })

  return { success: true }
}

export async function revokeBadge(
  userBadgeId: string
): Promise<{ success?: boolean; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createAdminClient()

  // Get badge info for logging
  const { data: badge } = await supabase
    .from('user_badges')
    .select('id, user_id, badge_definition_id, badge_definitions(slug)')
    .eq('id', userBadgeId)
    .single()

  const { error } = await supabase
    .from('user_badges')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', userBadgeId)

  if (error) return { error: error.message }

  logActivity({
    userId: auth.userId,
    action: 'badge.revoked',
    details: {
      userBadgeId,
      targetUserId: badge?.user_id,
      badgeSlug: (badge?.badge_definitions as unknown as { slug: string })?.slug,
    },
  })

  return { success: true }
}

export async function uploadBadgeIcon(
  badgeDefinitionId: string,
  formData: FormData
): Promise<{ success?: boolean; iconUrl?: string; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const file = formData.get('icon') as File
  if (!file) return { error: 'No file provided' }

  // Validate file type
  const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Use PNG, SVG, JPEG, or WebP.' }
  }

  // Validate size (max 500KB)
  if (file.size > 500 * 1024) {
    return { error: 'File too large. Maximum 500KB.' }
  }

  const supabase = createAdminClient()

  // Get badge slug for filename
  const { data: badgeDef } = await supabase
    .from('badge_definitions')
    .select('slug')
    .eq('id', badgeDefinitionId)
    .single()

  if (!badgeDef) return { error: 'Badge definition not found' }

  const ext = file.name.split('.').pop() || 'png'
  const filePath = `${badgeDef.slug}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('badge-icons')
    .upload(filePath, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('badge-icons')
    .getPublicUrl(filePath)

  const iconUrl = urlData.publicUrl

  // Update badge definition
  const { error: updateError } = await supabase
    .from('badge_definitions')
    .update({ icon_url: iconUrl })
    .eq('id', badgeDefinitionId)

  if (updateError) return { error: updateError.message }

  return { success: true, iconUrl }
}
