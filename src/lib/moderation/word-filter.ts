/**
 * Content moderation word filter.
 * Checks text against a blocklist of slurs, hate speech, and offensive terms.
 * Uses whole-word matching (case-insensitive) to minimize false positives.
 */

// Blocklist of terms that should not appear in user-generated content.
// Whole-word boundary matching prevents false positives on substrings.
const BLOCKED_TERMS = [
  // Racial slurs
  'nigger', 'nigga', 'niggas', 'nig', 'coon', 'darkie', 'wetback',
  'spic', 'spick', 'beaner', 'chink', 'gook', 'zipperhead', 'raghead',
  'towelhead', 'camel jockey', 'sandnigger', 'paki', 'kike', 'hymie',
  'wop', 'dago', 'greaseball', 'redskin', 'injun', 'squaw',
  'chinaman', 'jap',

  // Homophobic / transphobic slurs
  'fag', 'faggot', 'faggots', 'dyke', 'tranny', 'shemale',

  // Sexist slurs
  'cunt', 'twat', 'whore', 'slut',

  // Ableist slurs
  'retard', 'retarded', 'retards',

  // White supremacist / hate group terms
  'white power', 'white supremacy', 'heil hitler', 'sieg heil',
  'gas the', 'race war', '1488', '14/88',

  // Violent threats
  'kill yourself', 'kys',
]

// Build regex patterns for whole-word matching
const blockedPatterns = BLOCKED_TERMS.map(
  (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
)

export function checkContent(text: string): { allowed: boolean; reason?: string } {
  const normalized = text.toLowerCase()

  for (const pattern of blockedPatterns) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: 'Content contains inappropriate language. Please revise and try again.',
      }
    }
  }

  return { allowed: true }
}
