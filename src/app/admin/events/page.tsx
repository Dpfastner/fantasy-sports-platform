import { createAdminClient } from '@/lib/supabase/server'
import { EventsAdminTable } from './EventsAdminTable'

export default async function AdminEventsPage() {
  const admin = createAdminClient()

  const { data: tournaments } = await admin
    .from('event_tournaments')
    .select('id, name, slug, sport, format, status, starts_at, ends_at')
    .order('starts_at', { ascending: false })

  const { data: pools } = await admin
    .from('event_pools')
    .select('id, name, tournament_id, status, game_type, created_by')

  return (
    <div>
      <h1 className="brand-h1 text-2xl mb-6">Events & Tournaments</h1>
      <EventsAdminTable
        tournaments={tournaments || []}
        pools={pools || []}
      />
    </div>
  )
}
