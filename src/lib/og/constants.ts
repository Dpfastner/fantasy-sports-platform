/**
 * Brand colors and dimensions for OG image generation.
 * Hardcoded from the "Collegiate Fire" palette since Satori can't use CSS variables.
 */

export const OG = {
  // Dimensions (standard OG image size)
  width: 1200,
  height: 630,

  // Colors from Collegiate Fire palette
  bgPage: '#0D1520',
  bgSurface: '#1E293B',
  bgSurfaceHover: '#243556',
  gold: '#F5A623',
  red: '#E8513D',
  textPrimary: '#F7F8FA',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  success: '#22C55E',
} as const

export const SITE_URL = 'https://rivyls.com'
