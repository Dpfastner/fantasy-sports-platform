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
      'Draft real college football programs and chase weekly prizes all season long.',
    status: 'active',
    seasonLabel: 'Season',
    tagline: 'Draft teams. Score points. Win your league.',
  },
  {
    id: 'hockey',
    name: 'Hockey',
    shortName: 'Hockey',
    icon: '🏒',
    description:
      'Bracket predictions for the Frozen Four and NCAA hockey tournaments.',
    status: 'active',
    seasonLabel: 'Tournament',
    tagline: 'Fill your bracket. Predict the champion.',
  },
  {
    id: 'golf',
    name: 'Golf',
    shortName: 'Golf',
    icon: '⛳',
    description:
      'Build your roster and compete through the biggest tournaments in golf.',
    status: 'active',
    seasonLabel: 'Tournament',
    tagline: 'Pick your golfers. Watch the leaderboard.',
  },
  {
    id: 'rugby',
    name: 'Rugby',
    shortName: 'Rugby',
    icon: '🏉',
    description:
      'Survivor and pick\'em leagues for the Six Nations Championship.',
    status: 'active',
    seasonLabel: 'Tournament',
    tagline: 'Survive each round. Be the last one standing.',
  },
]

export function getSportById(id: string): SportConfig | undefined {
  return SPORTS.find((s) => s.id === id)
}

export function getActiveSports(): SportConfig[] {
  return SPORTS.filter((s) => s.status === 'active')
}
