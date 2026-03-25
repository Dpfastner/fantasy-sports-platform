import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getOrCreateCustomer, createPortalSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const customerId = await getOrCreateCustomer(admin, user.id, user.email!)
    const origin = req.headers.get('origin') || 'https://rivyls.com'
    const url = await createPortalSession(customerId, `${origin}/support`)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[stripe/portal] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
