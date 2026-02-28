import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/server'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')

  if (!leagueId) {
    return new Response('Missing leagueId', { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: league } = await supabase
    .from('leagues')
    .select(`
      name, max_teams, is_public,
      sports(name),
      league_settings(draft_date, entry_fee),
      league_members(id)
    `)
    .eq('id', leagueId)
    .single()

  if (!league) {
    return new Response('League not found', { status: 404 })
  }

  const fonts = await loadFonts()
  const teamCount = Array.isArray(league.league_members) ? league.league_members.length : 0
  const sportsRaw = league.sports as unknown
  const sport = Array.isArray(sportsRaw)
    ? (sportsRaw as { name: string }[])[0]?.name || 'College Football'
    : (sportsRaw as { name: string } | null)?.name || 'College Football'
  const settingsRaw = league.league_settings as unknown
  const settings = Array.isArray(settingsRaw)
    ? (settingsRaw as { draft_date: string | null; entry_fee: number }[])[0] || null
    : (settingsRaw as { draft_date: string | null; entry_fee: number } | null)
  const draftDate = settings?.draft_date
    ? new Date(settings.draft_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const entryFee = settings?.entry_fee || 0

  return new ImageResponse(
    (
      <CardLayout footerText="Join Now!">
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 24, color: OG.textSecondary, marginBottom: 8 }}>
            You&apos;re invited to join
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
            {league.name}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InfoRow emoji="🏈" text={sport} />
            <InfoRow
              emoji="👥"
              text={`${teamCount}/${league.max_teams} Teams Filled`}
            />
            {draftDate && <InfoRow emoji="📅" text={`Draft: ${draftDate}`} />}
            {entryFee > 0 && <InfoRow emoji="💰" text={`Entry Fee: $${entryFee}`} />}
            {entryFee === 0 && <InfoRow emoji="🆓" text="Free to play" />}
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
