/**
 * Parses a hex color string to RGB values.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6 && cleaned.length !== 3) return null

  const full =
    cleaned.length === 3
      ? cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2]
      : cleaned

  const num = parseInt(full, 16)
  if (isNaN(num)) return null

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Calculates relative luminance per WCAG 2.0.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculates contrast ratio between two colors per WCAG 2.0.
 * Returns a ratio >= 1 (higher = more contrast).
 */
function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  if (!c1 || !c2) return 1

  const l1 = relativeLuminance(c1.r, c1.g, c1.b)
  const l2 = relativeLuminance(c2.r, c2.g, c2.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Returns white or black text color based on which has better contrast
 * with the given background color. Targets WCAG AA 4.5:1 ratio.
 */
export function getContrastColor(bgColor: string): string {
  const rgb = hexToRgb(bgColor)
  if (!rgb) return '#ffffff'

  const luminance = relativeLuminance(rgb.r, rgb.g, rgb.b)
  return luminance > 0.179 ? '#000000' : '#ffffff'
}

/**
 * Returns the text color to use on a given background. If the provided
 * text color has sufficient contrast (WCAG AA 4.5:1), returns it as-is.
 * Otherwise, returns white or black for maximum readability.
 */
export function ensureContrast(bgColor: string, textColor: string): string {
  if (contrastRatio(bgColor, textColor) >= 4.5) return textColor
  return getContrastColor(bgColor)
}

/**
 * Returns true if a color is very light (luminance > 0.7).
 * Used to detect when a "primary" color like white would be a poor
 * background choice for a banner/pennant.
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return relativeLuminance(rgb.r, rgb.g, rgb.b) > 0.7
}
