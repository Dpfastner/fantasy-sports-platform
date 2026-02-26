import { z } from 'zod'
import { MAX_WEEK } from '@/lib/constants/season'

// ── Shared field schemas ────────────────────────────────────

export const uuidField = z.string().uuid()
export const weekNumber = z.number().int().min(0).max(MAX_WEEK)
export const yearField = z.number().int().min(2024).max(2030)

// ── Route-specific schemas ──────────────────────────────────

export const waitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
  referral_code: z.string().max(50).optional(),
})

export const leagueJoinSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
  teamName: z.string().min(3, 'Team name must be at least 3 characters').max(50).optional(),
})

export const transactionSchema = z.object({
  teamId: uuidField,
  leagueId: uuidField,
  seasonId: uuidField.optional(),
  weekNumber: weekNumber,
  droppedSchoolId: uuidField,
  addedSchoolId: uuidField,
  slotNumber: z.number().int().min(1),
  rosterPeriodId: uuidField,
})

export const reportSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required').max(2000),
  page: z.string().optional(),
  userAgent: z.string().optional(),
})

export const draftResetSchema = z.object({
  leagueId: uuidField,
})

export const pointsCalculateSchema = z.object({
  mode: z.enum(['week', 'season', 'league']).default('week'),
  year: z.number().int().optional(),
  week: weekNumber.optional(),
  startWeek: weekNumber.optional(),
  endWeek: weekNumber.optional(),
  leagueId: uuidField.optional(),
})

export const syncGamesSchema = z.object({
  year: yearField.optional(),
  week: weekNumber.optional(),
  seasonType: z.number().int().min(1).max(4).optional(),
  backfillAll: z.boolean().optional(),
})

export const syncBulkSchema = z.object({
  year: yearField.optional(),
  startWeek: weekNumber.optional(),
  endWeek: weekNumber.optional(),
  includePostseason: z.boolean().optional(),
})

export const syncRankingsSchema = z.object({
  year: yearField.optional(),
  week: weekNumber.optional(),
  seasonType: z.number().int().min(1).max(4).optional(),
  backfillAll: z.boolean().optional(),
  useCFP: z.boolean().optional(),
  useWebsite: z.boolean().optional(),
})

export const syncRankingsBackfillSchema = z.object({
  year: yearField,
  weeks: z.array(weekNumber).optional(),
})
