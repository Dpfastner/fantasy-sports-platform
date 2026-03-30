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

// Three icon rendering approaches for comparison (add ?style=emoji or ?style=unicode to URL)
const ICON_SVGS: Record<string, { viewBox: string; path: string; emoji: string; unicode: string }> = {
  star:   { viewBox: '0 0 24 24', path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', emoji: '\uD83C\uDF1F', unicode: '\u2605' },
  trophy: { viewBox: '0 0 24 24', path: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z', emoji: '\uD83C\uDFC6', unicode: '\u2605' },
  medal:  { viewBox: '0 0 24 24', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', emoji: '\uD83C\uDFC5', unicode: '\u2605' },
  flag:   { viewBox: '0 0 24 24', path: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z', emoji: '\uD83D\uDEA9', unicode: '\u2691' },
  crown:  { viewBox: '0 0 24 24', path: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z', emoji: '\uD83D\uDC51', unicode: '\u265B' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const badgeId = searchParams.get('badgeId')
  const iconStyle = searchParams.get('style') || 'svg' // svg | emoji | unicode

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
  const iconSvg = ICON_SVGS[def.fallback_icon] || ICON_SVGS.star

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
            }}
          >
            {def.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={def.icon_url} width={80} height={80} style={{ objectFit: 'contain' }} />
            ) : iconStyle === 'emoji' ? (
              <div style={{ fontSize: 72 }}>{iconSvg.emoji}</div>
            ) : iconStyle === 'unicode' ? (
              <div style={{ fontSize: 72, color: accentColor }}>{iconSvg.unicode}</div>
            ) : (
              <svg width="72" height="72" viewBox={iconSvg.viewBox} fill={accentColor}>
                <path d={iconSvg.path} />
              </svg>
            )}
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
