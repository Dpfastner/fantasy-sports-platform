import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('badge_definitions')
    .select('id, slug, label, requires_metadata')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ definitions: data || [] })
}
