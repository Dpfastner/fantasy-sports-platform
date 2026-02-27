import type { UserTier, UserBadgeWithDefinition } from '@/types/database'

interface UserBadgesProps {
  badges: UserBadgeWithDefinition[]
  tier?: UserTier
  size?: 'sm' | 'md'
}

const SPORT_LABELS: Record<string, string> = {
  college_football: 'CFB',
  hockey: 'Hockey',
  baseball: 'Baseball',
  basketball: 'Basketball',
  cricket: 'Cricket',
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 1a.75.75 0 01.75.75V3h3.5A2.75 2.75 0 0117 5.75v.5c0 1.58-.97 2.93-2.35 3.49a5.003 5.003 0 01-3.9 3.51v1h1.5a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5h1.5v-1a5.003 5.003 0 01-3.9-3.51A3.75 3.75 0 013 6.25v-.5A2.75 2.75 0 015.75 3h3.5V1.75A.75.75 0 0110 1zM5.75 4.5A1.25 1.25 0 004.5 5.75v.5a2.25 2.25 0 001.8 2.2 5.03 5.03 0 01-.55-2.45v-1.5zm8.5 1.25a1.25 1.25 0 00-1.25-1.25v1.5a5.03 5.03 0 01-.55 2.45 2.25 2.25 0 001.8-2.2v-.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MedalIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const FALLBACK_ICONS: Record<string, React.FC<{ className?: string }>> = {
  star: StarIcon,
  trophy: TrophyIcon,
  medal: MedalIcon,
}

/**
 * Groups season champion badges by sport+year and renders with multiplier.
 */
function groupSeasonChampionBadges(
  badges: UserBadgeWithDefinition[],
  size: 'sm' | 'md'
): React.ReactNode[] {
  const groups = new Map<string, { badge: UserBadgeWithDefinition; count: number }>()

  for (const b of badges) {
    const meta = b.metadata as Record<string, unknown>
    const sport = String(meta.sport || 'unknown')
    const year = String(meta.year || '')
    const key = `${sport}:${year}`

    const existing = groups.get(key)
    if (existing) {
      existing.count++
    } else {
      groups.set(key, { badge: b, count: 1 })
    }
  }

  return [...groups.entries()].map(([key, { badge, count }]) => {
    const meta = badge.metadata as Record<string, unknown>
    const sport = String(meta.sport || 'unknown')
    const year = String(meta.year || '')
    const sportLabel = SPORT_LABELS[sport] || sport
    const label = `${sportLabel} ${year}${count > 1 ? ` x${count}` : ''}`
    const def = badge.badge_definitions

    return (
      <BadgePill
        key={key}
        label={label}
        iconUrl={def.icon_url}
        fallbackIcon={def.fallback_icon}
        color={def.color}
        bgColor={def.bg_color}
        size={size}
        title={`${def.label}: ${label}`}
      />
    )
  })
}

function BadgePill({
  label,
  iconUrl,
  fallbackIcon,
  color,
  bgColor,
  size,
  title,
}: {
  label: string
  iconUrl: string | null
  fallbackIcon: string
  color: string
  bgColor: string
  size: 'sm' | 'md'
  title?: string
}) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const pillSize = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  const FallbackIcon = FALLBACK_ICONS[fallbackIcon] || StarIcon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${pillSize}`}
      style={{ backgroundColor: bgColor, color }}
      title={title}
    >
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" className={iconSize} />
      ) : (
        <FallbackIcon className={iconSize} />
      )}
      {label}
    </span>
  )
}

export function UserBadges({ badges, tier, size = 'md' }: UserBadgesProps) {
  const elements: React.ReactNode[] = []

  // Sort badges by sort_order
  const sorted = [...badges].sort(
    (a, b) => a.badge_definitions.sort_order - b.badge_definitions.sort_order
  )

  // Separate season champion badges for grouping
  const championBadges = sorted.filter(b => b.badge_definitions.slug === 'season_champion')
  const otherBadges = sorted.filter(b => b.badge_definitions.slug !== 'season_champion')

  // Render non-champion badges
  for (const badge of otherBadges) {
    const def = badge.badge_definitions
    elements.push(
      <BadgePill
        key={badge.id}
        label={def.label}
        iconUrl={def.icon_url}
        fallbackIcon={def.fallback_icon}
        color={def.color}
        bgColor={def.bg_color}
        size={size}
        title={def.description || def.label}
      />
    )
  }

  // Render grouped season champion badges
  if (championBadges.length > 0) {
    elements.push(...groupSeasonChampionBadges(championBadges, size))
  }

  // Tier badge (Pro) is separate from the badge system
  if (tier === 'pro') {
    elements.push(
      <span
        key="tier-pro"
        className={`inline-flex items-center gap-1 rounded-full bg-brand/20 text-brand font-semibold ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        }`}
      >
        Pro
      </span>
    )
  }

  if (elements.length === 0) return null

  return <>{elements}</>
}
