import { describe, it, expect } from 'vitest'
import {
  getEspnTeamId,
  matchTeamToSchool,
  getTeamLogoUrl,
  type ESPNTeam,
} from './espn'

// Helper to create a minimal ESPNTeam for testing
function makeTeam(overrides: Partial<ESPNTeam> = {}): ESPNTeam {
  return {
    id: '1',
    uid: 'uid-1',
    slug: 'team-slug',
    location: 'Team Location',
    name: 'Mascots',
    nickname: 'Mascots',
    abbreviation: 'TL',
    displayName: 'Team Location Mascots',
    shortDisplayName: 'Mascots',
    isActive: true,
    ...overrides,
  }
}

// ── getEspnTeamId ──────────────────────────────────────────

describe('getEspnTeamId', () => {
  it('returns ID for a known school (lowercase)', () => {
    const id = getEspnTeamId('alabama')
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('returns ID for a known school (mixed case)', () => {
    const id = getEspnTeamId('Alabama')
    expect(id).toBeTruthy()
  })

  it('trims whitespace', () => {
    const id = getEspnTeamId('  alabama  ')
    expect(id).toBeTruthy()
  })

  it('returns null for unknown school', () => {
    expect(getEspnTeamId('nonexistent university')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getEspnTeamId('')).toBeNull()
  })
})

// ── matchTeamToSchool ──────────────────────────────────────

describe('matchTeamToSchool', () => {
  it('matches on exact displayName', () => {
    const team = makeTeam({ displayName: 'Alabama Crimson Tide' })
    expect(matchTeamToSchool(team, 'alabama crimson tide')).toBe(true)
  })

  it('matches on location field', () => {
    const team = makeTeam({ location: 'Alabama' })
    expect(matchTeamToSchool(team, 'alabama')).toBe(true)
  })

  it('matches on contains (school name within ESPN name)', () => {
    const team = makeTeam({ displayName: 'University of Alabama' })
    expect(matchTeamToSchool(team, 'alabama')).toBe(true)
  })

  it('is case-insensitive', () => {
    const team = makeTeam({ displayName: 'OHIO STATE BUCKEYES' })
    expect(matchTeamToSchool(team, 'Ohio State Buckeyes')).toBe(true)
  })

  it('trims whitespace from school name', () => {
    const team = makeTeam({ displayName: 'Alabama' })
    expect(matchTeamToSchool(team, '  alabama  ')).toBe(true)
  })

  it('matches when school name contains ESPN name', () => {
    const team = makeTeam({ location: 'Texas', name: 'Longhorns' })
    expect(matchTeamToSchool(team, 'texas longhorns')).toBe(true)
  })

  it('does not match completely unrelated teams', () => {
    const team = makeTeam({
      displayName: 'Clemson Tigers',
      location: 'Clemson',
      name: 'Tigers',
      nickname: 'Tigers',
      shortDisplayName: 'Tigers',
    })
    expect(matchTeamToSchool(team, 'ohio state')).toBe(false)
  })

  it('matches on nickname field', () => {
    const team = makeTeam({ nickname: 'wolverines' })
    expect(matchTeamToSchool(team, 'wolverines')).toBe(true)
  })

  it('matches combined location + name', () => {
    const team = makeTeam({ location: 'Ohio State', name: 'Buckeyes' })
    expect(matchTeamToSchool(team, 'ohio state buckeyes')).toBe(true)
  })

  // Alias matching tests
  it('matches via SCHOOL_NAME_ALIASES (ole miss → mississippi)', () => {
    const team = makeTeam({ displayName: 'Ole Miss Rebels', location: 'Ole Miss' })
    expect(matchTeamToSchool(team, 'ole miss')).toBe(true)
  })

  it('matches via SCHOOL_NAME_ALIASES for schools with known aliases', () => {
    // USC is commonly referred to as "Southern California"
    const team = makeTeam({
      displayName: 'USC Trojans',
      location: 'USC',
      name: 'Trojans',
    })
    expect(matchTeamToSchool(team, 'usc')).toBe(true)
  })
})

// ── getTeamLogoUrl ─────────────────────────────────────────

describe('getTeamLogoUrl', () => {
  it('returns null when team has no logos', () => {
    const team = makeTeam({ logos: [] })
    expect(getTeamLogoUrl(team)).toBeNull()
  })

  it('returns null when logos is undefined', () => {
    const team = makeTeam({ logos: undefined })
    expect(getTeamLogoUrl(team)).toBeNull()
  })

  it('returns the first logo href when no dark/default preference matched', () => {
    const team = makeTeam({
      logos: [{ href: 'https://cdn.espn.com/logo1.png', width: 100, height: 100, alt: 'Logo', rel: ['full'] }],
    })
    expect(getTeamLogoUrl(team)).toBe('https://cdn.espn.com/logo1.png')
  })

  it('prefers dark logo over default', () => {
    const team = makeTeam({
      logos: [
        { href: 'https://cdn.espn.com/default.png', width: 100, height: 100, alt: 'Logo', rel: ['default'] },
        { href: 'https://cdn.espn.com/dark.png', width: 100, height: 100, alt: 'Logo', rel: ['dark'] },
      ],
    })
    expect(getTeamLogoUrl(team)).toBe('https://cdn.espn.com/dark.png')
  })

  it('falls back to default logo when no dark logo', () => {
    const team = makeTeam({
      logos: [
        { href: 'https://cdn.espn.com/default.png', width: 100, height: 100, alt: 'Logo', rel: ['default'] },
      ],
    })
    expect(getTeamLogoUrl(team)).toBe('https://cdn.espn.com/default.png')
  })

  it('handles logos with multiple rel values', () => {
    const team = makeTeam({
      logos: [
        { href: 'https://cdn.espn.com/dark-default.png', width: 100, height: 100, alt: 'Logo', rel: ['default', 'dark'] },
      ],
    })
    // Has both 'dark' and 'default' — dark takes precedence
    expect(getTeamLogoUrl(team)).toBe('https://cdn.espn.com/dark-default.png')
  })
})
