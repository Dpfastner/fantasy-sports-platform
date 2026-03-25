'use client'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
}

interface BracketGameCardProps {
  gameId: string
  participant1: Participant | null
  participant2: Participant | null
  pickedId: string | null
  winnerId: string | null
  status: string // scheduled | live | completed | final
  score1: number | null
  score2: number | null
  period: string | null
  clock: string | null
  startsAt: string | null
  roundPoints: number
  isLocked: boolean
  onPick: (gameId: string, participantId: string) => void
  eliminated1?: boolean
  eliminated2?: boolean
  compact?: boolean
}

export function BracketGameCard({
  gameId,
  participant1,
  participant2,
  pickedId,
  winnerId,
  status,
  score1,
  score2,
  period,
  clock,
  startsAt,
  roundPoints,
  isLocked,
  onPick,
  eliminated1 = false,
  eliminated2 = false,
  compact = false,
}: BracketGameCardProps) {
  const isFinal = status === 'final' || status === 'completed'
  const isLive = status === 'live'
  const canPick = !isLocked && !isFinal && !isLive

  const isCorrect = isFinal && winnerId && pickedId === winnerId
  const isIncorrect = isFinal && winnerId && pickedId && pickedId !== winnerId

  function TeamRow({
    participant,
    score,
    slot,
    eliminated,
  }: {
    participant: Participant | null
    score: number | null
    slot: 1 | 2
    eliminated: boolean
  }) {
    const pid = participant?.id
    const isPicked = pid === pickedId
    const isWinner = isFinal && pid === winnerId
    const isClickable = canPick && !!pid && !eliminated

    return (
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => pid && onPick(gameId, pid)}
        className={`
          flex items-center gap-1.5 w-full px-2 transition-colors text-left
          ${compact ? 'py-1' : 'py-1.5'}
          ${slot === 1 ? 'rounded-t-md border-b border-border/50' : 'rounded-b-md'}
          ${eliminated ? 'opacity-45' : ''}
          ${isPicked && !isFinal && !eliminated ? 'bg-brand/15 text-brand' : ''}
          ${isWinner ? 'bg-success/10' : ''}
          ${isFinal && pid === pickedId && !isWinner ? 'bg-danger/10' : ''}
          ${isClickable ? 'hover:bg-surface-subtle cursor-pointer' : 'cursor-default'}
          disabled:cursor-default
        `}
      >
        {/* Seed */}
        {participant?.seed ? (
          <span className="text-[10px] text-text-muted w-4 text-center shrink-0">
            {participant.seed}
          </span>
        ) : null}
        {!participant && <span className="w-4 shrink-0" />}

        {/* Logo */}
        {participant?.logoUrl ? (
          <img
            src={participant.logoUrl}
            alt=""
            className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} shrink-0 object-contain ${eliminated ? 'grayscale' : ''}`}
          />
        ) : participant ? (
          <span className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
        ) : null}

        {/* Name — full name on desktop, short name in compact/mobile */}
        <span className={`text-xs truncate flex-1 ${
          eliminated ? 'line-through text-text-muted' :
          participant ? 'text-text-primary' : 'text-text-muted italic'
        }`}>
          {compact
            ? (participant?.shortName || participant?.name || 'TBD')
            : (participant?.name || 'TBD')
          }
        </span>

        {/* Eliminated badge */}
        {eliminated && (
          <span className="text-[9px] text-danger-text shrink-0">OUT</span>
        )}

        {/* Score (live/final) */}
        {!eliminated && (isLive || isFinal) && score != null && (
          <span className={`text-xs font-semibold tabular-nums shrink-0 ${isWinner ? 'text-success-text' : 'text-text-secondary'}`}>
            {score}
          </span>
        )}

        {/* Pick indicator */}
        {isPicked && !isFinal && !eliminated && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
        )}
      </button>
    )
  }

  return (
    <div
      className={`
        rounded-md border overflow-hidden
        ${isCorrect ? 'border-success/40' : isIncorrect ? 'border-danger/40' : 'border-border'}
        ${compact ? 'w-[170px]' : 'w-[220px]'}
        bg-surface
      `}
    >
      {/* Live badge */}
      {isLive && (
        <div className="flex items-center justify-between px-2 py-0.5 bg-danger/10 border-b border-danger/20">
          <span className="text-[10px] font-semibold text-danger-text uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-text animate-pulse" />
            Live
          </span>
          {period && (
            <span className="text-[10px] text-text-muted">
              {period} {clock || ''}
            </span>
          )}
        </div>
      )}

      {/* Game date/time for scheduled games */}
      {!isLive && !isFinal && startsAt && (
        <div className="px-2 py-0.5 border-b border-border/50 text-center">
          <span className="text-[10px] text-text-muted">
            {new Date(startsAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </span>
        </div>
      )}

      <TeamRow participant={participant1} score={score1} slot={1} eliminated={eliminated1} />
      <TeamRow participant={participant2} score={score2} slot={2} eliminated={eliminated2} />

      {/* Points badge for completed games */}
      {isFinal && pickedId && (
        <div className={`text-center text-[10px] py-0.5 border-t ${
          isCorrect ? 'bg-success/10 text-success-text border-success/20' : 'bg-danger/10 text-danger-text border-danger/20'
        }`}>
          {isCorrect ? `+${roundPoints} pts` : '+0 pts'}
        </div>
      )}
    </div>
  )
}
