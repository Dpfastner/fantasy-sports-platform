/**
 * Reusable entry avatar — shows image, colored dot, or nothing.
 * Replaces duplicated logic across pool leaderboards and entry selectors.
 */

interface EntryAvatarProps {
  imageUrl?: string | null
  primaryColor?: string | null
  /** sm: w-3 dot / w-4 image (entry pills), md: w-5 (leaderboard rows) */
  size?: 'sm' | 'md'
  showBorder?: boolean
}

export function EntryAvatar({ imageUrl, primaryColor, size = 'md', showBorder = false }: EntryAvatarProps) {
  if (imageUrl) {
    const imgSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
    return <img src={imageUrl} alt="" className={`${imgSize} rounded-full object-cover shrink-0`} />
  }

  if (primaryColor && primaryColor !== '#1a1a1a') {
    const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5'
    const border = showBorder ? ' border border-border' : ''
    return <span className={`${dotSize} rounded-full shrink-0${border}`} style={{ backgroundColor: primaryColor }} />
  }

  return null
}
