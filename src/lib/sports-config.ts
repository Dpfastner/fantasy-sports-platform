export interface SportConfig {
  id: string
  name: string
  shortName: string
  icon: string
  description: string
  status: 'active' | 'coming_soon'
  seasonLabel: string
  tagline: string
}

export const SPORTS: SportConfig[] = [
  {
    id: 'cfb',
    name: 'College Football',
    shortName: 'CFB',
    icon: '🏈',
    description:
      'Draft real college football programs, compete head-to-head with friends, and chase weekly prizes all season long.',
    status: 'active',
    seasonLabel: 'Season',
    tagline: 'Draft teams. Score points. Win your league.',
  },
  {
    id: 'golf',
    name: 'Masters Tournament',
    shortName: 'Golf',
    icon: '⛳',
    description:
      'Build your bracket of golfers and compete through the most prestigious tournament in golf.',
    status: 'coming_soon',
    seasonLabel: 'Tournament',
    tagline: 'Pick your golfers. Watch the leaderboard.',
  },
]

export function getSportById(id: string): SportConfig | undefined {
  return SPORTS.find((s) => s.id === id)
}

export function getActiveSports(): SportConfig[] {
  return SPORTS.filter((s) => s.status === 'active')
}
