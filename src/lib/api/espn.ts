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
    const response = await fetch(`${ESPN_BASE_URL}/teams?limit=1000`)

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
    // groups=80 filters to FBS games only (returns ~100 games vs ~23 without it)
    const response = await fetch(
      `${ESPN_BASE_URL}/scoreboard?dates=${year}&seasontype=${seasonType}&week=${week}&groups=80`
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
 * Direct ESPN team ID mappings for all FBS schools
 * Key: our database name (lowercase), Value: ESPN team ID
 * This ensures 100% accurate matching without relying on fuzzy name matching
 */
const SCHOOL_ESPN_IDS: Record<string, string> = {
  'air force': '2005',
  'akron': '2006',
  'alabama': '333',
  'app state': '2026',
  'arizona': '12',
  'arizona st': '9',
  'arkansas': '8',
  'arkansas st': '2032',
  'army': '349',
  'auburn': '2',
  'ball state': '2050',
  'baylor': '239',
  'boise st': '68',
  'boston college': '103',
  'bowling green': '189',
  'buffalo': '2084',
  'byu': '252',
  'c michigan': '2117',
  'california': '25',
  'charlotte': '2429',
  'cincinnati': '2132',
  'clemson': '228',
  'coastal': '324',
  'colorado': '38',
  'colorado st': '36',
  'duke': '150',
  'e michigan': '2199',
  'east carolina': '151',
  'fau': '2226',
  'fiu': '2229',
  'florida': '57',
  'florida st': '52',
  'fresno st': '278',
  'ga southern': '290',
  'georgia': '61',
  'georgia st': '2247',
  'georgia tech': '59',
  "hawai'i": '62',
  'houston': '248',
  'illinois': '356',
  'indiana': '84',
  'iowa': '2294',
  'iowa state': '66',
  'james madison': '256',
  'jax state': '55',
  'kansas': '2305',
  'kansas st': '2306',
  'kennesaw st': '338',
  'kent state': '2309',
  'kentucky': '96',
  'liberty': '2335',
  'louisiana': '309',
  'louisiana tech': '2348',
  'louisville': '97',
  'lsu': '99',
  'marshall': '276',
  'maryland': '120',
  'memphis': '235',
  'miami': '2390',
  'miami oh': '193',
  'michigan': '130',
  'michigan st': '127',
  'minnesota': '135',
  'mississippi st': '344',
  'missouri': '142',
  'mtsu': '2393',
  'n illinois': '2459',
  'navy': '2426',
  'nc state': '152',
  'nebraska': '158',
  'nevada': '2440',
  'new mexico': '167',
  'new mexico st': '166',
  'north carolina': '153',
  'north texas': '249',
  'northwestern': '77',
  'notre dame': '87',
  'ohio': '195',
  'ohio state': '194',
  'oklahoma': '201',
  'oklahoma st': '197',
  'old dominion': '295',
  'ole miss': '145',
  'oregon': '2483',
  'oregon st': '204',
  'penn state': '213',
  'pitt': '221',
  'purdue': '2509',
  'rice': '242',
  'rutgers': '164',
  'sam houston': '2534',
  'san diego st': '21',
  'san josé st': '23',
  'smu': '2567',
  'south alabama': '6',
  'south carolina': '2579',
  'south florida': '58',
  'southern miss': '2572',
  'stanford': '24',
  'syracuse': '183',
  'tcu': '2628',
  'temple': '218',
  'tennessee': '2633',
  'texas': '251',
  'texas a&m': '245',
  'texas st': '326',
  'texas tech': '2641',
  'toledo': '2649',
  'troy': '2653',
  'tulane': '2655',
  'tulsa': '202',
  'uab': '5',
  'ucf': '2116',
  'ucla': '26',
  'uconn': '41',
  'ul monroe': '2433',
  'umass': '113',
  'unlv': '2439',
  'usc': '30',
  'utah': '254',
  'utah state': '328',
  'utep': '2638',
  'utsa': '2636',
  'vanderbilt': '238',
  'virginia': '258',
  'virginia tech': '259',
  'w michigan': '2711',
  'wake forest': '154',
  'washington': '264',
  'washington st': '265',
  'west virginia': '277',
  'western ky': '98',
  'wisconsin': '275',
  'wyoming': '2751',
}

// School name aliases for fuzzy matching
const SCHOOL_NAME_ALIASES: Record<string, string[]> = {
  'usc': ['southern california', 'trojans'],
  'ucla': ['california los angeles', 'bruins'],
  'lsu': ['louisiana state'],
  'ole miss': ['mississippi rebels'],
  'smu': ['southern methodist'],
  'tcu': ['texas christian'],
  'ucf': ['central florida'],
  'fau': ['florida atlantic'],
  'fiu': ['florida international'],
  'unlv': ['las vegas'],
  'utep': ['texas el paso'],
  'utsa': ['texas san antonio'],
  'uab': ['alabama birmingham'],
  'umass': ['massachusetts'],
}

/**
 * Get ESPN team ID for a school name
 */
export function getEspnTeamId(schoolName: string): string | null {
  return SCHOOL_ESPN_IDS[schoolName.toLowerCase().trim()] || null
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

  // Check explicit aliases first
  const aliases = SCHOOL_NAME_ALIASES[normalizedSchoolName]
  if (aliases) {
    for (const alias of aliases) {
      if (namesToCheck.some(n => n.includes(alias) || alias.includes(n))) {
        return true
      }
    }
  }

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
