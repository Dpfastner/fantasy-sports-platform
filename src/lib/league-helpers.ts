/**
 * Extract the season year from a league's joined seasons data.
 * Supabase returns the join as either an object or array depending on the query.
 */
export function getLeagueYear(seasons: unknown): number {
  if (Array.isArray(seasons)) {
    return (seasons as { year: number }[])[0]?.year || new Date().getFullYear()
  }
  return (seasons as { year: number } | null)?.year || new Date().getFullYear()
}

/**
 * Extract the season name from a league's joined seasons data.
 */
export function getLeagueSeasonName(seasons: unknown, fallbackYear?: number): string {
  const year = fallbackYear ?? getLeagueYear(seasons)
  if (Array.isArray(seasons)) {
    return (seasons as { name?: string }[])[0]?.name || `${year} Season`
  }
  return (seasons as { name?: string } | null)?.name || `${year} Season`
}
