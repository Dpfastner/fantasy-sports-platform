/**
 * Color palette definitions for Rivyls brand theming.
 *
 * Each palette defines 5 brand colors plus ~30 derived semantic tokens
 * for surfaces, text, borders, and functional colors.
 *
 * Used by PaletteProvider to set CSS variables via data-palette attribute.
 */

export interface PaletteColors {
  // Brand swatches (the 5 named colors from the design PDF)
  primary: string
  secondary: string
  tertiary: string
  neutral: string
  base: string

  // Surfaces
  page: string
  pageAlt: string
  gradientFrom: string
  gradientTo: string
  surface: string
  surfaceHover: string
  surfaceSubtle: string
  surfaceInset: string

  // Borders
  border: string
  borderSubtle: string

  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string
  textInverse: string

  // Brand action (buttons, links, active states)
  brand: string
  brandHover: string
  brandText: string
  brandSubtle: string

  // Accent (secondary brand color)
  accent: string
  accentText: string
  accentSubtle: string

  // Functional / semantic
  success: string
  successText: string
  successSubtle: string
  danger: string
  dangerText: string
  dangerSubtle: string
  warning: string
  warningText: string
  warningSubtle: string
  info: string
  infoText: string
  infoSubtle: string

  // Special purpose
  highlightRow: string
  highlightSpecial: string
  liveIndicator: string
}

export interface PaletteDefinition {
  id: string
  name: string
  label: string
  description: string
  mode: 'dark' | 'light'
  recommended?: boolean
  colors: PaletteColors
}

export const palettes: PaletteDefinition[] = [
  {
    id: 'collegiate-fire',
    name: 'Collegiate Fire',
    label: 'Option A',
    description: 'Bold navy foundation with fierce red energy and championship gold accents',
    mode: 'dark',
    recommended: true,
    colors: {
      // Brand swatches
      primary: '#1B2A4A',
      secondary: '#E8513D',
      tertiary: '#F5A623',
      neutral: '#F7F8FA',
      base: '#0D1520',

      // Surfaces
      page: '#0D1520',
      pageAlt: '#111827',
      gradientFrom: '#0D1520',
      gradientTo: '#1B2A4A',
      surface: '#1E293B',
      surfaceHover: '#243556',
      surfaceSubtle: 'rgba(30, 41, 59, 0.5)',
      surfaceInset: 'rgba(30, 41, 59, 0.7)',

      // Borders
      border: '#334155',
      borderSubtle: 'rgba(51, 65, 85, 0.5)',

      // Text
      textPrimary: '#F7F8FA',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      textInverse: '#0D1520',

      // Brand action
      brand: '#E8513D',
      brandHover: '#D4432F',
      brandText: '#E8513D',
      brandSubtle: 'rgba(232, 81, 61, 0.15)',

      // Accent
      accent: '#F5A623',
      accentText: '#F5A623',
      accentSubtle: 'rgba(245, 166, 35, 0.15)',

      // Functional
      success: '#22C55E',
      successText: '#4ADE80',
      successSubtle: 'rgba(34, 197, 94, 0.15)',
      danger: '#EF4444',
      dangerText: '#F87171',
      dangerSubtle: 'rgba(239, 68, 68, 0.15)',
      warning: '#F5A623',
      warningText: '#FBBF24',
      warningSubtle: 'rgba(245, 166, 35, 0.15)',
      info: '#818CF8',
      infoText: '#A5B4FC',
      infoSubtle: 'rgba(129, 140, 248, 0.15)',

      // Special
      highlightRow: 'rgba(232, 81, 61, 0.1)',
      highlightSpecial: 'rgba(245, 166, 35, 0.15)',
      liveIndicator: '#22C55E',
    },
  },
  {
    id: 'heritage-field',
    name: 'Heritage Field',
    label: 'Option C',
    description: 'Deep forest greens with warm copper tones and vintage cream accents',
    mode: 'dark',
    colors: {
      // Brand swatches
      primary: '#1A3C2A',
      secondary: '#C47A3A',
      tertiary: '#F2E8D5',
      neutral: '#F2E8D5',
      base: '#0E2218',

      // Surfaces
      page: '#0E2218',
      pageAlt: '#132E20',
      gradientFrom: '#0E2218',
      gradientTo: '#1A3C2A',
      surface: '#1A3C2A',
      surfaceHover: '#245235',
      surfaceSubtle: 'rgba(26, 60, 42, 0.5)',
      surfaceInset: 'rgba(26, 60, 42, 0.7)',

      // Borders
      border: '#2D5E3F',
      borderSubtle: 'rgba(45, 94, 63, 0.5)',

      // Text
      textPrimary: '#F2E8D5',
      textSecondary: '#B8A88A',
      textMuted: '#7A6F5C',
      textInverse: '#0E2218',

      // Brand action
      brand: '#C47A3A',
      brandHover: '#B06A2E',
      brandText: '#C47A3A',
      brandSubtle: 'rgba(196, 122, 58, 0.15)',

      // Accent
      accent: '#D4A23A',
      accentText: '#D4A23A',
      accentSubtle: 'rgba(212, 162, 58, 0.15)',

      // Functional
      success: '#4ADE80',
      successText: '#86EFAC',
      successSubtle: 'rgba(74, 222, 128, 0.15)',
      danger: '#EF4444',
      dangerText: '#F87171',
      dangerSubtle: 'rgba(239, 68, 68, 0.15)',
      warning: '#D4A23A',
      warningText: '#E4B84A',
      warningSubtle: 'rgba(212, 162, 58, 0.15)',
      info: '#A78BFA',
      infoText: '#C4B5FD',
      infoSubtle: 'rgba(167, 139, 250, 0.15)',

      // Special
      highlightRow: 'rgba(196, 122, 58, 0.1)',
      highlightSpecial: 'rgba(212, 162, 58, 0.15)',
      liveIndicator: '#4ADE80',
    },
  },
  {
    id: 'royal-gambit',
    name: 'Royal Gambit',
    label: 'Option E',
    description: 'Rich royal purple with amber brilliance and rose fire accents',
    mode: 'dark',
    colors: {
      // Brand swatches
      primary: '#2A1A3E',
      secondary: '#F59E0B',
      tertiary: '#FAF5EE',
      neutral: '#FAF5EE',
      base: '#1A0F28',

      // Surfaces
      page: '#1A0F28',
      pageAlt: '#221533',
      gradientFrom: '#1A0F28',
      gradientTo: '#2A1A3E',
      surface: '#2A1A3E',
      surfaceHover: '#3A2555',
      surfaceSubtle: 'rgba(42, 26, 62, 0.5)',
      surfaceInset: 'rgba(42, 26, 62, 0.7)',

      // Borders
      border: '#4A3066',
      borderSubtle: 'rgba(74, 48, 102, 0.5)',

      // Text
      textPrimary: '#FAF5EE',
      textSecondary: '#C4B5D4',
      textMuted: '#8B7BA0',
      textInverse: '#1A0F28',

      // Brand action
      brand: '#F59E0B',
      brandHover: '#D97706',
      brandText: '#F59E0B',
      brandSubtle: 'rgba(245, 158, 11, 0.15)',

      // Accent
      accent: '#E74C6F',
      accentText: '#E74C6F',
      accentSubtle: 'rgba(231, 76, 111, 0.15)',

      // Functional
      success: '#4ADE80',
      successText: '#86EFAC',
      successSubtle: 'rgba(74, 222, 128, 0.15)',
      danger: '#E74C6F',
      dangerText: '#F472B6',
      dangerSubtle: 'rgba(231, 76, 111, 0.15)',
      warning: '#F59E0B',
      warningText: '#FBBF24',
      warningSubtle: 'rgba(245, 158, 11, 0.15)',
      info: '#A78BFA',
      infoText: '#C4B5FD',
      infoSubtle: 'rgba(167, 139, 250, 0.15)',

      // Special
      highlightRow: 'rgba(245, 158, 11, 0.1)',
      highlightSpecial: 'rgba(231, 76, 111, 0.15)',
      liveIndicator: '#4ADE80',
    },
  },
  {
    id: 'warm-kickoff',
    name: 'Warm Kickoff',
    label: 'Option H',
    description: 'Warm linen tones with slate blue depth and burnt orange energy',
    mode: 'light',
    colors: {
      // Brand swatches
      primary: '#FAF7F2',
      secondary: '#3D5A80',
      tertiary: '#E07A3A',
      neutral: '#F0EBE1',
      base: '#2C3E50',

      // Surfaces
      page: '#FAF7F2',
      pageAlt: '#F5F0E8',
      gradientFrom: '#FAF7F2',
      gradientTo: '#F0EBE1',
      surface: '#FFFFFF',
      surfaceHover: '#F5F0E8',
      surfaceSubtle: 'rgba(44, 62, 80, 0.06)',
      surfaceInset: 'rgba(44, 62, 80, 0.08)',

      // Borders
      border: '#D5CFC3',
      borderSubtle: 'rgba(44, 62, 80, 0.12)',

      // Text
      textPrimary: '#2C3E50',
      textSecondary: '#5D6D7E',
      textMuted: '#95A5A6',
      textInverse: '#FAF7F2',

      // Brand action
      brand: '#3D5A80',
      brandHover: '#2C4A6E',
      brandText: '#3D5A80',
      brandSubtle: 'rgba(61, 90, 128, 0.1)',

      // Accent
      accent: '#E07A3A',
      accentText: '#D06A2A',
      accentSubtle: 'rgba(224, 122, 58, 0.1)',

      // Functional
      success: '#16A34A',
      successText: '#15803D',
      successSubtle: 'rgba(22, 163, 74, 0.1)',
      danger: '#DC2626',
      dangerText: '#B91C1C',
      dangerSubtle: 'rgba(220, 38, 38, 0.1)',
      warning: '#E07A3A',
      warningText: '#C2690F',
      warningSubtle: 'rgba(224, 122, 58, 0.1)',
      info: '#6366F1',
      infoText: '#4F46E5',
      infoSubtle: 'rgba(99, 102, 241, 0.1)',

      // Special
      highlightRow: 'rgba(61, 90, 128, 0.08)',
      highlightSpecial: 'rgba(224, 122, 58, 0.1)',
      liveIndicator: '#16A34A',
    },
  },
]

export const DEFAULT_PALETTE_ID = 'collegiate-fire'

/**
 * Generate CSS variable declarations for a palette.
 * Used to create the [data-palette="..."] CSS blocks.
 */
export function paletteToCSSVars(palette: PaletteDefinition): Record<string, string> {
  const { colors } = palette
  return {
    '--palette-page': colors.page,
    '--palette-page-alt': colors.pageAlt,
    '--palette-gradient-from': colors.gradientFrom,
    '--palette-gradient-to': colors.gradientTo,
    '--palette-surface': colors.surface,
    '--palette-surface-hover': colors.surfaceHover,
    '--palette-surface-subtle': colors.surfaceSubtle,
    '--palette-surface-inset': colors.surfaceInset,
    '--palette-tertiary': colors.tertiary,
    '--palette-border': colors.border,
    '--palette-border-subtle': colors.borderSubtle,
    '--palette-text-primary': colors.textPrimary,
    '--palette-text-secondary': colors.textSecondary,
    '--palette-text-muted': colors.textMuted,
    '--palette-text-inverse': colors.textInverse,
    '--palette-brand': colors.brand,
    '--palette-brand-hover': colors.brandHover,
    '--palette-brand-text': colors.brandText,
    '--palette-brand-subtle': colors.brandSubtle,
    '--palette-accent': colors.accent,
    '--palette-accent-text': colors.accentText,
    '--palette-accent-subtle': colors.accentSubtle,
    '--palette-success': colors.success,
    '--palette-success-text': colors.successText,
    '--palette-success-subtle': colors.successSubtle,
    '--palette-danger': colors.danger,
    '--palette-danger-text': colors.dangerText,
    '--palette-danger-subtle': colors.dangerSubtle,
    '--palette-warning': colors.warning,
    '--palette-warning-text': colors.warningText,
    '--palette-warning-subtle': colors.warningSubtle,
    '--palette-info': colors.info,
    '--palette-info-text': colors.infoText,
    '--palette-info-subtle': colors.infoSubtle,
    '--palette-highlight-row': colors.highlightRow,
    '--palette-highlight-special': colors.highlightSpecial,
    '--palette-live-indicator': colors.liveIndicator,
  }
}
