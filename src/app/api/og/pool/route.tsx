import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/server'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const poolId = searchParams.get('poolId')

  if (!poolId) {
    return new Response('Missing poolId', { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: pool } = await supabase
    .from('event_pools')
    .select(`
      name, visibility, max_entries, status,
      event_tournaments(name, sport, format, starts_at),
      event_entries(id)
    `)
    .eq('id', poolId)
    .single()

  if (!pool) {
    return new Response('Pool not found', { status: 404 })
  }

  const fonts = await loadFonts()
  const memberCount = Array.isArray(pool.event_entries) ? pool.event_entries.length : 0
  const tournamentRaw = pool.event_tournaments as unknown
  const tournament = Array.isArray(tournamentRaw)
    ? (tournamentRaw as { name: string; sport: string; format: string; starts_at: string }[])[0] || null
    : (tournamentRaw as { name: string; sport: string; format: string; starts_at: string } | null)

  const sportEmoji: Record<string, string> = {
    hockey: '🏒',
    basketball: '🏀',
    football: '🏈',
    baseball: '⚾',
    golf: '⛳',
    rugby: '🏉',
    soccer: '⚽',
    volleyball: '🏐',
  }

  const formatLabels: Record<string, string> = {
    bracket: 'Bracket Challenge',
    pickem: "Pick'em",
    survivor: 'Survivor Pool',
  }

  const sport = tournament?.sport || 'sports'
  const emoji = sportEmoji[sport] || '🏆'
  const format = formatLabels[tournament?.format || ''] || 'Event Pool'
  const startsAt = tournament?.starts_at
    ? new Date(tournament.starts_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return new ImageResponse(
    (
      <CardLayout footerText="Join the action!">
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 24, color: OG.textSecondary, marginBottom: 8 }}>
            {tournament?.name || 'Event Pool'}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 48,
              fontFamily: 'Montserrat',
              fontWeight: 700,
              color: OG.gold,
              marginBottom: 40,
            }}
          >
            {pool.name}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InfoRow emoji={emoji} text={format} />
            <InfoRow
              emoji="👥"
              text={`${memberCount} Member${memberCount !== 1 ? 's' : ''}${pool.max_entries ? ` / ${pool.max_entries} max` : ''}`}
            />
            {startsAt && <InfoRow emoji="📅" text={`Starts: ${startsAt}`} />}
            <InfoRow
              emoji={pool.visibility === 'public' ? '🌐' : '🔒'}
              text={pool.visibility === 'public' ? 'Public Pool' : 'Private Pool'}
            />
          </div>
        </div>
      </CardLayout>
    ),
    {
      width: OG.width,
      height: OG.height,
      fonts: [
        { name: 'Montserrat', data: fonts.montserratBold, weight: 700 as const },
        { name: 'Inter', data: fonts.interRegular, weight: 400 as const },
      ],
    }
  )
}

function InfoRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: OG.textPrimary }}>
      <span style={{ marginRight: 12 }}>{emoji}</span>
      {text}
    </div>
  )
}
