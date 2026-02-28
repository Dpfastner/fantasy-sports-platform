import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/server'
import { TradingCardLayout } from '@/lib/og/trading-card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

type BadgeDefinitionRow = {
  id: string
  slug: string
  label: string
  description: string | null
  fallback_icon: string
  color: string
  bg_color: string
  icon_url: string | null
}

const SPORT_LABELS: Record<string, string> = {
  college_football: 'CFB',
  hockey: 'Hockey',
  baseball: 'Baseball',
  basketball: 'Basketball',
  cricket: 'Cricket',
}

const ICON_CHARS: Record<string, string> = {
  star: '\u2605',
  trophy: '\uD83C\uDFC6',
  medal: '\uD83E\uDD47',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const badgeId = searchParams.get('badgeId')

  if (!badgeId) {
    return new Response('Missing badgeId', { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: userBadge } = await supabase
    .from('user_badges')
    .select('id, user_id, metadata, granted_at, badge_definitions(*)')
    .eq('id', badgeId)
    .is('revoked_at', null)
    .single()

  if (!userBadge) {
    return new Response('Badge not found', { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userBadge.user_id)
    .single()

  const fonts = await loadFonts()
  const defRaw = userBadge.badge_definitions as unknown
  const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as BadgeDefinitionRow
  const meta = (userBadge.metadata || {}) as Record<string, unknown>
  const displayName = profile?.display_name || 'A Rivyls Player'

  let subtitle = def.description || def.label
  if (def.slug === 'season_champion') {
    const sport = SPORT_LABELS[String(meta.sport || '')] || String(meta.sport || '')
    const year = String(meta.year || '')
    const leagueName = String(meta.league_name || '')
    subtitle = `${sport} ${year}${leagueName ? ` \u2014 ${leagueName}` : ''}`
  }

  const accentColor = def.color || OG.gold
  const bgColor = def.bg_color || OG.bgSurface
  const iconChar = ICON_CHARS[def.fallback_icon] || '\u2605'

  return new ImageResponse(
    (
      <TradingCardLayout accentColor={accentColor}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
          }}
        >
          {/* Badge circle */}
          <div
            style={{
              display: 'flex',
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: bgColor,
              border: `4px solid ${accentColor}`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              fontSize: 72,
            }}
          >
            {iconChar}
          </div>

          {/* Badge label */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: 56,
              color: accentColor,
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            {def.label}
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              color: OG.textSecondary,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {subtitle}
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              width: 200,
              height: 2,
              backgroundColor: accentColor,
              marginBottom: 24,
              opacity: 0.4,
            }}
          />

          {/* Earned by */}
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: OG.textMuted,
              letterSpacing: '0.15em',
            }}
          >
            EARNED BY
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: 32,
              color: OG.textPrimary,
              marginTop: 8,
            }}
          >
            {displayName}
          </div>
        </div>
      </TradingCardLayout>
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
