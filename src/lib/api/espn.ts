/**
 * ESPN API Client for College Football Data
 *
 * ESPN has public endpoints that don't require authentication for basic data.
 * This client fetches team logos, game schedules, and scores.
 */

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football'

export interface ESPNTeam {
  id: string
  uid: string
  slug: string
  location: string
  name: string
  nickname: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  color?: string
  alternateColor?: string
  isActive: boolean
  logos?: {
    href: string
    width: number
    height: number
    alt: string
    rel: string[]
  }[]
  links?: {
    href: string
    text: string
  }[]
}

export interface ESPNTeamResponse {
  sports: {
    leagues: {
      teams: {
        team: ESPNTeam
      }[]
    }[]
  }[]
}

export interface ESPNGame {
  id: string
  uid: string
  date: string
  name: string
  shortName: string
  season: {
    year: number
    type: number
  }
  week: {
    number: number
  }
  competitions: {
    id: string
    date: string
    attendance: number
    venue: {
      id: string
      fullName: string
      address: {
        city: string
        state: string
      }
    }
    competitors: {
      id: string
      homeAway: 'home' | 'away'
      team: ESPNTeam
      score: string
      winner?: boolean
      records?: {
        name: string
        summary: string
      }[]
      curatedRank?: {
        current: number
      }
    }[]
    status: {
      clock: number
      displayClock: string
      period: number
      type: {
        id: string
        name: string
        state: 'pre' | 'in' | 'post'
        completed: boolean
        description: string
      }
    }
    situation?: {
      downDistanceText: string
      possession: string
      isRedZone: boolean
    }
    broadcasts?: {
      market: string
      names: string[]
    }[]
  }[]
}

export interface ESPNScoreboardResponse {
  events: ESPNGame[]
  leagues: {
    id: string
    name: string
    abbreviation: string
    season: {
      year: number
      type: number
    }
  }[]
}

export interface ESPNRankingsResponse {
  rankings: {
    id: string
    name: string
    type: string
    current: boolean
    ranks: {
      current: number
      previous: number
      points: number
      firstPlaceVotes: number
      team: ESPNTeam
      recordSummary: string
    }[]
  }[]
}

/**
 * Fetch all FBS teams with their logos
 */
export async function fetchAllTeams(): Promise<ESPNTeam[]> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/teams?limit=200`)

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    const data = await response.json()

    // ESPN returns teams nested in sports > leagues > teams
    const teams: ESPNTeam[] = []

    if (data.sports) {
      for (const sport of data.sports) {
        for (const league of sport.leagues || []) {
          for (const teamWrapper of league.teams || []) {
            teams.push(teamWrapper.team)
          }
        }
      }
    }

    return teams
  } catch (error) {
    console.error('Error fetching ESPN teams:', error)
    throw error
  }
}

/**
 * Fetch scoreboard for a specific week
 */
export async function fetchScoreboard(
  year: number = new Date().getFullYear(),
  week: number = 1,
  seasonType: number = 2 // 2 = regular season, 3 = postseason
): Promise<ESPNGame[]> {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/scoreboard?dates=${year}&seasontype=${seasonType}&week=${week}`
    )

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    const data: ESPNScoreboardResponse = await response.json()
    return data.events || []
  } catch (error) {
    console.error('Error fetching ESPN scoreboard:', error)
    throw error
  }
}

/**
 * Fetch current AP Top 25 rankings
 */
export async function fetchRankings(year: number = new Date().getFullYear()): Promise<ESPNRankingsResponse> {
  try {
    const response = await fetch(
      `${ESPN_BASE_URL}/rankings?seasons=${year}`
    )

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching ESPN rankings:', error)
    throw error
  }
}

/**
 * Get a specific team's details
 */
export async function fetchTeam(teamId: string): Promise<ESPNTeam | null> {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/teams/${teamId}`)

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`ESPN API error: ${response.status}`)
    }

    const data = await response.json()
    return data.team
  } catch (error) {
    console.error('Error fetching ESPN team:', error)
    throw error
  }
}

/**
 * Match an ESPN team to a school name
 * ESPN uses various naming conventions, so we need fuzzy matching
 */
export function matchTeamToSchool(
  espnTeam: ESPNTeam,
  schoolName: string
): boolean {
  const normalizedSchoolName = schoolName.toLowerCase().trim()

  // Check various ESPN name fields
  const namesToCheck = [
    espnTeam.displayName?.toLowerCase(),
    espnTeam.name?.toLowerCase(),
    espnTeam.shortDisplayName?.toLowerCase(),
    espnTeam.location?.toLowerCase(),
    espnTeam.nickname?.toLowerCase(),
    `${espnTeam.location} ${espnTeam.name}`.toLowerCase(),
  ].filter(Boolean) as string[]

  // Direct match
  if (namesToCheck.some(n => n === normalizedSchoolName)) {
    return true
  }

  // Contains match
  if (namesToCheck.some(n => n.includes(normalizedSchoolName) || normalizedSchoolName.includes(n))) {
    return true
  }

  // Handle common variations
  const schoolVariations = getSchoolVariations(normalizedSchoolName)
  return schoolVariations.some(variation =>
    namesToCheck.some(n => n.includes(variation) || variation.includes(n))
  )
}

/**
 * Get common name variations for schools
 */
function getSchoolVariations(schoolName: string): string[] {
  const variations: string[] = [schoolName]

  // Common abbreviations and variations
  const replacements: Record<string, string[]> = {
    'university': ['u', 'univ'],
    'state': ['st', 'state'],
    'southern': ['so', 'south'],
    'northern': ['no', 'north'],
    'eastern': ['e', 'east'],
    'western': ['w', 'west'],
    'central': ['c', 'cent'],
    'florida': ['fl', 'fla'],
    'california': ['ca', 'cal'],
    'texas': ['tx', 'tex'],
    'louisiana': ['la'],
    'mississippi': ['miss'],
    'tennessee': ['tenn'],
    'michigan': ['mich'],
    'minnesota': ['minn'],
    'oklahoma': ['okla'],
    'washington': ['wash'],
    'wisconsin': ['wisc'],
    'connecticut': ['conn', 'uconn'],
  }

  // Add variations based on replacements
  let current = schoolName
  for (const [full, abbrs] of Object.entries(replacements)) {
    if (current.includes(full)) {
      for (const abbr of abbrs) {
        variations.push(current.replace(full, abbr))
      }
    }
  }

  // Handle "University of X" vs "X University"
  if (schoolName.startsWith('university of ')) {
    variations.push(schoolName.replace('university of ', ''))
  }

  return variations
}

/**
 * Get the primary logo URL for a team
 */
export function getTeamLogoUrl(team: ESPNTeam, size: 'default' | 'small' | 'large' = 'default'): string | null {
  if (!team.logos || team.logos.length === 0) {
    return null
  }

  // Prefer dark background logos for our dark UI
  const darkLogo = team.logos.find(l => l.rel?.includes('dark'))
  const defaultLogo = team.logos.find(l => l.rel?.includes('default')) || team.logos[0]

  const logo = darkLogo || defaultLogo
  return logo?.href || null
}
