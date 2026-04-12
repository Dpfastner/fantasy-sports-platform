'use client'

import { useState, useEffect, useMemo } from 'react'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

interface CutCountdownProps {
  participants: Participant[]
  allRosterPicks?: Record<string, string[]>
  myRosterPickIds?: string[]
  /** ISO timestamp of the cut (end of Round 2). */
  cutTime?: string
  /** ISO timestamp of the champion (end of Round 4). */
  championTime?: string
  /** Tournament status — when 'completed', show champion banner */
  tournamentStatus?: string
  /** Winner name for champion banner */
  winnerName?: string | null
  /** Winner score for champion banner */
  winnerScore?: number | null
  /** Callback to replay the Green Jacket ceremony */
  onReplayCeremony?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(target: number): TimeLeft | null {
  const diff = target - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

// Masters 2026 defaults — R1: Apr 9, R2: Apr 10, R3: Apr 11, R4: Apr 12
const MASTERS_2026_CUT_TIME = '2026-04-10T22:00:00Z'       // Thursday ~6pm ET (end of R2)
const MASTERS_2026_CHAMPION_TIME = '2026-04-12T23:00:00Z'   // Saturday ~7pm ET (end of R4)

/**
 * Multi-mode countdown for Masters tournaments:
 *
 * 1. Pre-cut (Round 1-2): Countdown to the cut.
 * 2. Post-cut banner: "X of Y survived."
 * 3. Post-cut + pre-champion: Countdown to the champion.
 *
 * Both countdowns persist for future events — just pass different times.
 */
export function CutCountdown({
  participants,
  allRosterPicks,
  myRosterPickIds,
  cutTime = MASTERS_2026_CUT_TIME,
  championTime = MASTERS_2026_CHAMPION_TIME,
  tournamentStatus,
  winnerName,
  winnerScore,
  onReplayCeremony,
}: CutCountdownProps) {
  const cutTarget = new Date(cutTime).getTime()
  const champTarget = new Date(championTime).getTime()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const [cutTimeLeft, setCutTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(cutTarget))
  const [champTimeLeft, setChampTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(champTarget))

  useEffect(() => {
    const tick = () => {
      setCutTimeLeft(calculateTimeLeft(cutTarget))
      setChampTimeLeft(calculateTimeLeft(champTarget))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [cutTarget, champTarget])

  // Detect if cut has been made
  const hasCut = participants.some(
    p => String((p.metadata as Record<string, unknown>)?.status || '') === 'cut'
  )
  const cutCountdownExpired = !cutTimeLeft

  // Get all unique rostered participant IDs
  const rosteredIds = useMemo(() => {
    if (myRosterPickIds && myRosterPickIds.length > 0) return new Set(myRosterPickIds)
    if (!allRosterPicks) return new Set<string>()
    const ids = new Set<string>()
    for (const picks of Object.values(allRosterPicks)) {
      for (const id of picks) ids.add(id)
    }
    return ids
  }, [allRosterPicks, myRosterPickIds])

  // Post-cut: categorize rostered golfers
  const cutResults = useMemo(() => {
    if (!hasCut) return null
    const survived: { id: string; name: string }[] = []
    const cut: { id: string; name: string }[] = []
    for (const p of participants) {
      if (!rosteredIds.has(p.id)) continue
      const status = String((p.metadata as Record<string, unknown>)?.status || 'active')
      if (status === 'cut') {
        cut.push({ id: p.id, name: p.name })
      } else {
        survived.push({ id: p.id, name: p.name })
      }
    }
    return { survived, cut, total: survived.length + cut.length }
  }, [hasCut, participants, rosteredIds])

  // Determine current round label
  const currentRound = useMemo(() => {
    let maxRound = 0
    for (const p of participants) {
      const meta = (p.metadata || {}) as Record<string, unknown>
      const cr = meta.current_round as number | undefined
      if (cr && cr > maxRound) maxRound = cr
    }
    return maxRound || null
  }, [participants])

  const roundLabel = currentRound
    ? currentRound === 1 ? 'Round 1' : currentRound === 2 ? 'Round 2' : currentRound === 3 ? 'Moving Day' : 'Championship Sunday'
    : null

  // Decide which countdown to show
  const showCutCountdown = !hasCut && !cutCountdownExpired
  const showChampionCountdown = (hasCut || cutCountdownExpired) && champTimeLeft

  // Tournament completed — show champion banner instead of countdowns
  if (tournamentStatus === 'completed' && winnerName) {
    return (
      <div className="bg-[#FAF6EE] border border-[#E8C96A]/40 rounded-lg p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[.2em] text-[#8B7355] mb-1">
              Masters 2026 Champion
            </div>
            <div className="text-xl font-bold text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
              {winnerName}
            </div>
            {winnerScore != null && (
              <div className="text-sm text-[#1a5c38] font-semibold mt-0.5">
                {winnerScore === 0 ? 'E' : winnerScore > 0 ? `+${winnerScore}` : String(winnerScore)}
              </div>
            )}
          </div>
          {onReplayCeremony && (
            <button
              onClick={onReplayCeremony}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: '#1a5c38', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Replay Ceremony
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Cut Countdown (pre-cut, before Friday) */}
      {showCutCountdown && cutTimeLeft && (
        <div className="bg-[#FAF6EE] border border-[#E8C96A]/40 rounded-lg p-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[.2em] text-[#8B7355] mb-1.5 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.696.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
              </svg>
              Time until the cut
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {cutTimeLeft.days > 0 && (
                <>
                  <TimeUnit value={cutTimeLeft.days} label="days" />
                  <TimeDivider />
                </>
              )}
              <TimeUnit value={cutTimeLeft.hours} label="hours" />
              <TimeDivider />
              <TimeUnit value={cutTimeLeft.minutes} label="min" />
              <TimeDivider />
              <TimeUnit value={cutTimeLeft.seconds} label="sec" />
            </div>
          </div>
        </div>
      )}

      {/* R3: Post-cut survival banner / R4: Your golfers in the top 10 */}
      {!bannerDismissed && hasCut && currentRound && currentRound >= 3 && (
        <div className="relative">
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute top-3 right-3 text-[#8B7355] hover:text-[#1a1a1a] transition-colors z-10"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {currentRound >= 4 ? (
          <YourTop10Banner participants={participants} rosteredIds={rosteredIds} />
        ) : cutResults ? (
          <div className="bg-[#FAF6EE] border border-[#E8C96A]/40 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-[.2em] text-[#8B7355] mb-2">
              The Cut Has Been Made
            </div>
            <div className="text-base font-bold text-[#1a1a1a] mb-2">
              {cutResults.survived.length} of {cutResults.total} rostered picks survived
            </div>
            <div className="flex flex-wrap gap-2">
              {cutResults.survived.map(g => (
                <span key={g.id} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(22,101,52,0.12)', color: '#166534' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {g.name}
                </span>
              ))}
              {cutResults.cut.map(g => (
                <span key={g.id} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(185,28,28,0.1)', color: '#991B1B' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      )}

      {/* Champion Countdown (post-cut or when cut countdown expired) */}
      {showChampionCountdown && champTimeLeft && (
        <div className="bg-[#FAF6EE] border border-[#E8C96A]/40 rounded-lg p-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[.2em] text-[#8B7355] mb-1.5 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#C9A84C]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 3h14l-1.5 5H6.5L5 3zm1.5 7h11l-.75 2.5H7.25L6.5 10zm1.5 4.5h8l-.5 1.5H8.5L8 14.5zM10 18h4v3h-4v-3z" />
              </svg>
              {roundLabel ? `${roundLabel} · ` : ''}Countdown to the Champion
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {champTimeLeft.days > 0 && (
                <>
                  <TimeUnit value={champTimeLeft.days} label="days" />
                  <TimeDivider />
                </>
              )}
              <TimeUnit value={champTimeLeft.hours} label="hours" />
              <TimeDivider />
              <TimeUnit value={champTimeLeft.minutes} label="min" />
              <TimeDivider />
              <TimeUnit value={champTimeLeft.seconds} label="sec" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl sm:text-2xl font-bold text-[#1a1a1a] tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] sm:text-[10px] text-[#8B7355] uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  )
}

function TimeDivider() {
  return <span className="text-xl sm:text-2xl font-bold text-[#C9A84C]/50">:</span>
}

function formatScore(n: number): string {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : String(n)
}

function YourTop10Banner({ participants, rosteredIds }: { participants: Participant[]; rosteredIds: Set<string> }) {
  const top10 = useMemo(() => {
    return participants
      .filter(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        return meta.status !== 'cut' && meta.status !== 'wd' && meta.status !== 'dq' && meta.score_to_par != null
      })
      .sort((a, b) => ((a.metadata as Record<string, unknown>)?.score_to_par as number) - ((b.metadata as Record<string, unknown>)?.score_to_par as number))
      .slice(0, 10)
  }, [participants])

  const myInTop10 = top10.filter(p => rosteredIds.has(p.id))

  return (
    <div className="bg-[#FAF6EE] border border-[#E8C96A]/40 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-[.2em] text-[#8B7355] mb-2">
        Championship Sunday
      </div>
      <div className="text-base font-bold text-[#1a1a1a] mb-3">
        {myInTop10.length > 0
          ? `You have ${myInTop10.length} golfer${myInTop10.length !== 1 ? 's' : ''} in the top 10`
          : 'None of your golfers are in the top 10 yet'}
      </div>
      <div className="flex flex-wrap gap-2">
        {top10.map((p, i) => {
          const meta = (p.metadata || {}) as Record<string, unknown>
          const score = meta.score_to_par as number
          const isMine = rosteredIds.has(p.id)
          // Tie-aware position
          let pos = i + 1
          if (i > 0) {
            const prevScore = ((top10[i-1].metadata || {}) as Record<string, unknown>).score_to_par as number
            if (score === prevScore) {
              // Find the first golfer with this score
              let j = i - 1
              while (j > 0 && ((top10[j-1].metadata || {}) as Record<string, unknown>).score_to_par === score) j--
              pos = j + 1
            }
          }
          const isTied = top10.some((g, k) => k !== i &&
            ((g.metadata || {}) as Record<string, unknown>).score_to_par === score)
          const posLabel = isTied ? `T${pos}.` : `${pos}.`

          return (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={isMine
                ? { background: 'rgba(22,101,52,0.12)', color: '#166534' }
                : { background: 'rgba(0,0,0,0.05)', color: '#8B7355' }
              }
            >
              <span className="text-[10px]">{posLabel}</span>
              {p.name}
              <span className="font-bold">{formatScore(score)}</span>
              {isMine && <span className="text-[9px] font-bold">★</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
