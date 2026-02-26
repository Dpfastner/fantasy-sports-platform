import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getEnvironment,
  isProduction,
  isSandbox,
  isDevelopment,
  areCronsEnabled,
  shouldShowDevBadge,
  getEnvironmentDisplayName,
  getEnvironmentBadgeColor,
} from './env'

describe('env utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env for each test
    vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', '')
    vi.stubEnv('ENABLE_CRONS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ── getEnvironment ─────────────────────────────────────

  describe('getEnvironment', () => {
    it('returns "production" when set', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(getEnvironment()).toBe('production')
    })

    it('returns "sandbox" when set', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(getEnvironment()).toBe('sandbox')
    })

    it('returns "development" when set', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(getEnvironment()).toBe('development')
    })

    it('defaults to "development" when unset', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', '')
      expect(getEnvironment()).toBe('development')
    })

    it('defaults to "development" for invalid values', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'staging')
      expect(getEnvironment()).toBe('development')
    })
  })

  // ── Boolean checks ─────────────────────────────────────

  describe('isProduction', () => {
    it('returns true in production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(isProduction()).toBe(true)
    })

    it('returns false in sandbox', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(isProduction()).toBe(false)
    })

    it('returns false in development', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(isProduction()).toBe(false)
    })
  })

  describe('isSandbox', () => {
    it('returns true in sandbox', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(isSandbox()).toBe(true)
    })

    it('returns false in production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(isSandbox()).toBe(false)
    })
  })

  describe('isDevelopment', () => {
    it('returns true when unset (default)', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', '')
      expect(isDevelopment()).toBe(true)
    })

    it('returns true in development', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(isDevelopment()).toBe(true)
    })

    it('returns false in production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(isDevelopment()).toBe(false)
    })
  })

  // ── areCronsEnabled ────────────────────────────────────

  describe('areCronsEnabled', () => {
    it('returns true in production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(areCronsEnabled()).toBe(true)
    })

    it('returns false in sandbox by default', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(areCronsEnabled()).toBe(false)
    })

    it('returns true in sandbox when ENABLE_CRONS=true', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      vi.stubEnv('ENABLE_CRONS', 'true')
      expect(areCronsEnabled()).toBe(true)
    })

    it('returns false in development by default', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(areCronsEnabled()).toBe(false)
    })

    it('returns true in development when ENABLE_CRONS=true', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      vi.stubEnv('ENABLE_CRONS', 'true')
      expect(areCronsEnabled()).toBe(true)
    })
  })

  // ── shouldShowDevBadge ─────────────────────────────────

  describe('shouldShowDevBadge', () => {
    it('returns false in production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(shouldShowDevBadge()).toBe(false)
    })

    it('returns true in sandbox', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(shouldShowDevBadge()).toBe(true)
    })

    it('returns true in development', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(shouldShowDevBadge()).toBe(true)
    })
  })

  // ── Display helpers ────────────────────────────────────

  describe('getEnvironmentDisplayName', () => {
    it('returns "Production" for production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(getEnvironmentDisplayName()).toBe('Production')
    })

    it('returns "Sandbox" for sandbox', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(getEnvironmentDisplayName()).toBe('Sandbox')
    })

    it('returns "Development" for development', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(getEnvironmentDisplayName()).toBe('Development')
    })
  })

  describe('getEnvironmentBadgeColor', () => {
    it('returns green for production', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      expect(getEnvironmentBadgeColor()).toBe('bg-green-500')
    })

    it('returns yellow for sandbox', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'sandbox')
      expect(getEnvironmentBadgeColor()).toBe('bg-yellow-500')
    })

    it('returns blue for development', () => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'development')
      expect(getEnvironmentBadgeColor()).toBe('bg-blue-500')
    })
  })
})
