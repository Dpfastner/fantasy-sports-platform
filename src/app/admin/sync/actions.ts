'use server'

import { createClient } from '@/lib/supabase/server'

const ADMIN_USER_IDS = [
  '5ab25825-1e29-4949-b798-61a8724170d6',
]

export async function runSync(
  syncType: string,
  body?: Record<string, unknown>
): Promise<{ data?: unknown; error?: string }> {
  // Verify admin auth server-side
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || !ADMIN_USER_IDS.includes(user.id)) {
    return { error: 'Unauthorized' }
  }

  const apiKey = process.env.SYNC_API_KEY
  if (!apiKey) {
    return { error: 'SYNC_API_KEY not configured on server' }
  }

  // Determine endpoint and method
  let endpoint = ''
  let method = 'POST'

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')

  switch (syncType) {
    case 'schools':
      endpoint = `${baseUrl}/api/sync/schools`
      break
    case 'games':
      endpoint = `${baseUrl}/api/sync/games`
      break
    case 'rankings':
      endpoint = `${baseUrl}/api/sync/rankings`
      break
    case 'bulk':
      endpoint = `${baseUrl}/api/sync/bulk`
      break
    case 'live':
      endpoint = `${baseUrl}/api/cron/gameday-sync`
      method = 'GET'
      break
    default:
      return { error: `Unknown sync type: ${syncType}` }
  }

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: method === 'POST' && body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Sync failed' }
    }

    return { data }
  } catch (err) {
    return { error: String(err) }
  }
}
