'use client'

import { ShareButton } from './ShareButton'
import { buildShareUrl } from '@/lib/share'
import { SITE_URL } from '@/lib/og/constants'
import type { UserBadgeWithDefinition } from '@/types/database'

const SPORT_LABELS: Record<string, string> = {
  college_football: 'CFB',
  hockey: 'Hockey',
  baseball: 'Baseball',
  basketball: 'Basketball',
  cricket: 'Cricket',
}

const FALLBACK_CHARS: Record<string, string> = {
  star: '\u2605',
  trophy: '\uD83C\uDFC6',
  medal: '\uD83E\uDD47',
}

interface TrophyCaseProps {
  badges: UserBadgeWithDefinition[]
  displayName: string
}

export function TrophyCase({ badges, displayName }: TrophyCaseProps) {
  if (badges.length === 0) return null

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-4">Trophy Case</h2>
      <div className="flex flex-wrap gap-6">
        {badges.map((badge) => {
          const def = badge.badge_definitions
          const meta = (badge.metadata || {}) as Record<string, unknown>

          let sublabel: string | null = null
          if (def.slug === 'season_champion') {
            const sport = SPORT_LABELS[String(meta.sport || '')] || String(meta.sport || '')
            const year = String(meta.year || '')
            const leagueName = String(meta.league_name || '')
            sublabel = `${sport} ${year}`
            if (leagueName) sublabel += ` \u2014 ${leagueName}`
          }

          const iconChar = FALLBACK_CHARS[def.fallback_icon] || '\u2605'
          const shareUrl = buildShareUrl(
            `/profile/${encodeURIComponent(badge.user_id)}`,
            { source: 'badge', campaign: def.slug }
          )

          return (
            <div key={badge.id} className="flex flex-col items-center gap-2 w-28">
              {/* Circle icon */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl border-2 flex-shrink-0"
                style={{
                  backgroundColor: def.bg_color,
                  borderColor: def.color,
                }}
                title={def.description || def.label}
              >
                {def.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={def.icon_url} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <span>{iconChar}</span>
                )}
              </div>

              {/* Labels */}
              <div className="text-center">
                <p
                  className="text-xs font-semibold leading-tight"
                  style={{ color: def.color }}
                >
                  {def.label}
                </p>
                {sublabel && (
                  <p className="text-[10px] text-text-muted leading-tight mt-0.5">
                    {sublabel}
                  </p>
                )}
              </div>

              {/* Share button */}
              <ShareButton
                shareData={{
                  title: `${displayName} earned the ${def.label} badge on Rivyls!`,
                  text: `Check out this badge I earned on Rivyls: ${def.label}`,
                  url: shareUrl,
                }}
                ogImageUrl={`${SITE_URL}/api/og/badge?badgeId=${badge.id}`}
                label="Share"
                className="text-[11px] px-2 py-1 bg-surface-subtle hover:bg-surface-inset text-text-secondary rounded flex items-center gap-1 transition-colors"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
