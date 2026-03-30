/**
 * Brand colors and dimensions for OG image generation.
 * Hardcoded from the default Rivyls palette since Satori can't use CSS variables.
 * Updated March 2026 to match current palette (deep purple + amber).
 */

export const OG = {
  // Dimensions (standard OG image size)
  width: 1200,
  height: 630,

  // Colors from default Rivyls palette
  bgPage: '#1A0F28',
  bgSurface: '#2A1A3E',
  bgSurfaceHover: '#362650',
  gold: '#F59E0B',
  red: '#E8513D',
  textPrimary: '#FAF5EE',
  textSecondary: '#C4B5D4',
  textMuted: '#8B7BA0',
  border: '#4A3066',
  success: '#22C55E',
} as const

export const SITE_URL = 'https://rivyls.com'
