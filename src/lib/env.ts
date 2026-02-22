/**
 * Environment detection utilities
 *
 * Use these helpers to check which environment the app is running in.
 * This allows for environment-specific behavior like:
 * - Disabling crons in sandbox/development
 * - Showing dev badges in non-production
 * - Logging differences
 */

export type Environment = 'production' | 'sandbox' | 'development'

/**
 * Get the current environment
 * Defaults to 'development' if not set
 */
export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT
  if (env === 'production' || env === 'sandbox' || env === 'development') {
    return env
  }
  return 'development'
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

/**
 * Check if running in sandbox (test environment with real-ish data)
 */
export function isSandbox(): boolean {
  return getEnvironment() === 'sandbox'
}

/**
 * Check if running in development (local)
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}

/**
 * Check if crons should be enabled
 * Enabled in production, or when ENABLE_CRONS=true (for sandbox at rivyls.com)
 */
export function areCronsEnabled(): boolean {
  if (process.env.ENABLE_CRONS === 'true') return true
  return isProduction()
}

/**
 * Check if dev badge should be shown
 * Show in sandbox and development, hide in production
 */
export function shouldShowDevBadge(): boolean {
  return !isProduction()
}

/**
 * Get environment display name for UI
 */
export function getEnvironmentDisplayName(): string {
  const env = getEnvironment()
  switch (env) {
    case 'production':
      return 'Production'
    case 'sandbox':
      return 'Sandbox'
    case 'development':
      return 'Development'
    default:
      return 'Unknown'
  }
}

/**
 * Get environment badge color class
 */
export function getEnvironmentBadgeColor(): string {
  const env = getEnvironment()
  switch (env) {
    case 'production':
      return 'bg-green-500'
    case 'sandbox':
      return 'bg-yellow-500'
    case 'development':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}
