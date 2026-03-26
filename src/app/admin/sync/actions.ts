'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchHockeyRecords } from '@/lib/events/espn-adapters'

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
  const cronSecret = process.env.CRON_SECRET

  // Determine endpoint and method
  let endpoint = ''
  let method = 'POST'
  let authKey = apiKey

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
    case 'event-records':
      return await syncHockeyRecordsDirect()
    default:
      return { error: `Unknown sync type: ${syncType}` }
  }

  try {
    if (!authKey) {
      return { error: 'API key not configured on server' }
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
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

async function syncHockeyRecordsDirect(): Promise<{ data?: unknown; error?: string }> {
  try {
    const admin = createAdminClient()

    const { data: tournaments } = await admin
      .from('event_tournaments')
      .select('id')
      .eq('sport', 'hockey')

    if (!tournaments?.length) {
      return { error: 'No hockey tournaments found' }
    }

    const { data: participants } = await admin
      .from('event_participants')
      .select('id, name, metadata')
      .in('tournament_id', tournaments.map(t => t.id))

    if (!participants?.length) {
      return { error: 'No participants found' }
    }

    const records = await fetchHockeyRecords()
    if (records.size === 0) {
      return { error: 'Could not fetch records from ESPN. HTML structure may have changed.' }
    }

    const sortedParticipants = [...participants].sort((a, b) => b.name.length - a.name.length)
    let matched = 0
    const matchDetails: Array<{ participant: string; record: string | null }> = []

    for (const participant of sortedParticipants) {
      let record = records.get(participant.name) || null
      if (!record) {
        for (const [espnName, espnRecord] of records) {
          if (espnName.startsWith(participant.name) || participant.name.startsWith(espnName)) {
            record = espnRecord
            break
          }
        }
      }
      if (!record && participant.name === 'Connecticut') {
        record = records.get('UConn') || null
      }

      if (record) {
        const existingMeta = (participant.metadata as Record<string, unknown>) || {}
        await admin
          .from('event_participants')
          .update({ metadata: { ...existingMeta, season_record: record } })
          .eq('id', participant.id)
        matched++
      }
      matchDetails.push({ participant: participant.name, record })
    }

    return {
      data: {
        success: true,
        summary: { matched, totalSchools: participants.length },
        matchDetails,
      },
    }
  } catch (err) {
    return { error: String(err) }
  }
}
