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
  droppedSchoolId: uuidField.optional(),    // optional for add-only (empty roster slot)
  addedSchoolId: uuidField,
  slotNumber: z.number().int().min(1),
  rosterPeriodId: uuidField.optional(),     // optional for add-only (empty roster slot)
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

export const watchlistToggleSchema = z.object({
  schoolId: uuidField,
  leagueId: uuidField,
})

export const announcementCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(2000),
  pinned: z.boolean().optional().default(false),
})

export const announcementUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(2000).optional(),
  pinned: z.boolean().optional(),
})

// ── League Chat ─────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
})

export const reactionToggleSchema = z.object({
  messageId: uuidField,
  emoji: z.string().min(1).max(10),
})

// ── Draft Chat ──────────────────────────────────────────────

export const draftChatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  draftId: uuidField,
})

// ── Auto-Pick & Draft Queue ────────────────────────────────

export const autoPickSchema = z.object({
  draftId: uuidField,
  expectedPick: z.number().int().min(1),
})

export const watchlistReorderSchema = z.object({
  leagueId: uuidField,
  order: z.array(z.object({
    schoolId: uuidField,
    priority: z.number().int().min(1),
  })),
})

// ── Trades ─────────────────────────────────────────────────

export const tradeProposalSchema = z.object({
  receiverTeamId: uuidField,
  giving: z.array(uuidField).min(1, 'Must offer at least one school'),
  receiving: z.array(uuidField).min(1, 'Must request at least one school'),
  message: z.string().max(500).optional(),
  counterToTradeId: uuidField.optional(),
  dropSchoolIds: z.array(uuidField).optional(),
})

export const tradeActionSchema = z.object({
  tradeId: uuidField,
  action: z.enum(['accept', 'reject', 'cancel']),
  dropSchoolIds: z.array(uuidField).optional(),
})

export const tradeVetoSchema = z.object({
  tradeId: uuidField,
  reason: z.string().min(1, 'Veto reason is required').max(500),
})

// ── Push Notifications ──────────────────────────────────────

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

// ── Event Games ───────────────────────────────────────────

export const eventPoolCreateSchema = z.object({
  tournamentId: uuidField,
  name: z.string().min(2, 'Pool name too short').max(60, 'Pool name too long'),
  visibility: z.enum(['public', 'private']).default('private'),
  scoringRules: z.record(z.string(), z.number()).optional(),
  tiebreaker: z.enum(['none', 'championship_score', 'first_match_score', 'most_upsets', 'random']).default('none'),
  deadline: z.string().datetime().optional(),
  maxEntries: z.number().int().min(2).max(1000).optional(),
  maxEntriesPerUser: z.number().int().min(1).max(10).optional(),
  leagueId: uuidField.optional(),
})

export const eventPoolJoinSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
  displayName: z.string().max(50).optional(),
})

export const eventBracketPickSchema = z.object({
  entryId: uuidField,
  picks: z.array(z.object({
    gameId: uuidField,
    participantId: uuidField,
  })).min(1, 'Must submit at least one pick'),
  tiebreakerPrediction: z.object({
    team1_score: z.number().int().min(0).max(99),
    team2_score: z.number().int().min(0).max(99),
  }).optional(),
})

export const eventSurvivorPickSchema = z.object({
  entryId: uuidField,
  weekNumber: z.number().int().min(1).max(20),
  participantId: uuidField,
})

export const eventPickemPickSchema = z.object({
  entryId: uuidField,
  picks: z.array(z.object({
    gameId: uuidField,
    participantId: uuidField,
    confidence: z.number().int().min(1).max(20).optional(),
  })).min(1, 'Must submit at least one pick'),
})
