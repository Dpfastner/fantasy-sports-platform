'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

interface RoarMoment {
  id: string
  golferName: string
  type: 'eagle' | 'birdie_run' | 'top5_move' | 'big_swing'
  description: string
  timestamp: number
  holeNumber?: number
}

interface SundayRoarProps {
  participants: Participant[]
  allRosterPicks?: Record<string, string[]>
}

interface GolfHole {
  hole: number
  round: number
  strokes: number
  par: number
  scoreType: string
}

/**
 * Detect roar-worthy moments by comparing current participant data
 * against a cached snapshot. Fires on realtime updates.
 *
 * Triggers:
 * - Eagle (or better) made
 * - 2+ consecutive birdies (or better) in the current round
 * - Moves into top 5
 * - Score improves by 3+ strokes in the current round vs prior snapshot
 */
const MUTE_KEY = 'rivyls-roar-muted'

export function useSundayRoar({ participants, allRosterPicks }: SundayRoarProps) {
  const [moments, setMoments] = useState<RoarMoment[]>([])
  const [rippleGolferId, setRippleGolferId] = useState<string | null>(null)
  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(MUTE_KEY) === '1'
  })
  const prevSnapshotRef = useRef<Map<string, { holes: GolfHole[]; position: number | null; scoreToPar: number | null }>>(new Map())
  const seenMomentsRef = useRef<Set<string>>(new Set())
  const puttRef = useRef<HTMLAudioElement | null>(null)
  const crowdRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    puttRef.current = new Audio('/audio/Putt.mp3')
    crowdRef.current = new Audio('/audio/Crowd.mp3')
    puttRef.current.volume = 0.6
    crowdRef.current.volume = 0.5
    return () => { puttRef.current?.pause(); crowdRef.current?.pause() }
  }, [])

  const playRoar = useCallback(() => {
    if (muted) return
    const putt = puttRef.current
    const crowd = crowdRef.current
    if (!putt || !crowd) return

    // Play putt, start crowd slightly before putt ends so they overlap
    putt.currentTime = 0
    crowd.currentTime = 0
    crowd.volume = 0

    putt.play().catch(() => {})
    // Start crowd 60% through the putt with a volume fade-in
    const puttDuration = putt.duration || 1
    setTimeout(() => {
      crowd.play().catch(() => {})
      // Fade crowd in over 500ms
      let fadeInVol = 0
      const fadeIn = setInterval(() => {
        fadeInVol += 0.1
        if (fadeInVol >= 0.5) {
          crowd.volume = 0.5
          clearInterval(fadeIn)
        } else {
          crowd.volume = fadeInVol
        }
      }, 50)
    }, puttDuration * 650) // start at 65% of putt duration

    putt.onended = () => {
      // putt finished, crowd is already playing
      // Fade out crowd so audio ends at 7.5s total (matching overlay)
      // Crowd starts ~0.65s in, needs ~5.85s play + 1s fade = ends at ~7.5s
      setTimeout(() => {
        let vol = 0.5
        const fade = setInterval(() => {
          vol -= 0.05
          if (vol <= 0) {
            crowd.pause()
            crowd.volume = 0.5
            clearInterval(fade)
          } else {
            crowd.volume = vol
          }
        }, 100) // 10 steps over 1 second fade
      }, 5850)
    }
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // Get all rostered participant IDs
  const rosteredIds = useMemo(() => {
    if (!allRosterPicks) return new Set<string>()
    const ids = new Set<string>()
    for (const picks of Object.values(allRosterPicks)) {
      for (const id of picks) ids.add(id)
    }
    return ids
  }, [allRosterPicks])

  const detectRoars = useCallback(() => {
    const newMoments: RoarMoment[] = []
    const prevSnapshot = prevSnapshotRef.current

    // Sunday Roar is R4 only — the point is Championship Sunday
    // TEMP: disabled for testing on dev (uncomment for production)
    // const fieldRound = Math.max(
    //   ...participants.map(p => ((p.metadata as Record<string, unknown>)?.current_round as number) || 0),
    //   0
    // )
    // if (fieldRound !== 4) return

    for (const p of participants) {
      if (!rosteredIds.has(p.id)) continue
      const meta = (p.metadata || {}) as Record<string, unknown>
      if (meta.status === 'cut') continue

      const holes = (meta.holes as GolfHole[] | undefined) || []
      const position = meta.position as number | null
      const scoreToPar = meta.score_to_par as number | null
      const currentRound = meta.current_round as number | undefined

      const prev = prevSnapshot.get(p.id)
      const prevHoles = prev?.holes || []

      // TEMP: allow any round for testing (production: currentRound !== 4)
      if (!currentRound || holes.length === 0) continue

      // Current round holes only
      const roundHoles = holes
        .filter(h => h.round === currentRound)
        .sort((a, b) => a.hole - b.hole)
      const prevRoundHoles = prevHoles
        .filter(h => h.round === currentRound)
        .sort((a, b) => a.hole - b.hole)

      // Find NEW holes (in current data but not in previous)
      const prevHoleNums = new Set(prevRoundHoles.map(h => h.hole))
      const newHoles = roundHoles.filter(h => !prevHoleNums.has(h.hole))

      for (const hole of newHoles) {
        const diff = hole.strokes - hole.par

        // Eagle or better
        if (diff <= -2) {
          const type = diff <= -3 ? 'albatross' : 'eagle'
          const momentId = `${p.id}-${type}-${currentRound}-${hole.hole}`
          if (!seenMomentsRef.current.has(momentId)) {
            seenMomentsRef.current.add(momentId)
            newMoments.push({
              id: momentId,
              golferName: p.name,
              type: 'eagle',
              description: diff <= -3
                ? `${p.name} makes an ALBATROSS on hole ${hole.hole}! Absolute scenes.`
                : `${p.name} eagles hole ${hole.hole}. The roar was heard across the course.`,
              timestamp: Date.now(),
              holeNumber: hole.hole,
            })
          }
        }

        // Check for 3+ consecutive birdies (or better)
        if (diff <= -1 && hole.hole >= 3) {
          const prev1 = roundHoles.find(h => h.hole === hole.hole - 1)
          const prev2 = roundHoles.find(h => h.hole === hole.hole - 2)
          if (prev1 && (prev1.strokes - prev1.par) <= -1 &&
              prev2 && (prev2.strokes - prev2.par) <= -1) {
            const momentId = `${p.id}-birdie_run-${currentRound}-${hole.hole}`
            if (!seenMomentsRef.current.has(momentId)) {
              seenMomentsRef.current.add(momentId)
              // Count the full run length
              let runLength = 3
              for (let h = hole.hole - 3; h >= 1; h--) {
                const earlier = roundHoles.find(rh => rh.hole === h)
                if (earlier && (earlier.strokes - earlier.par) <= -1) runLength++
                else break
              }
              newMoments.push({
                id: momentId,
                golferName: p.name,
                type: 'birdie_run',
                description: `${p.name} is on fire — ${runLength} birdies in a row through hole ${hole.hole}.`,
                timestamp: Date.now(),
                holeNumber: hole.hole,
              })
            }
          }
        }
      }

      // Top 5 move (position improved to ≤5 from >5)
      if (position != null && position <= 5 && prev?.position != null && prev.position > 5) {
        const momentId = `${p.id}-top5-${currentRound}`
        if (!seenMomentsRef.current.has(momentId)) {
          seenMomentsRef.current.add(momentId)
          newMoments.push({
            id: momentId,
            golferName: p.name,
            type: 'top5_move',
            description: `${p.name} moves into the top 5 at ${scoreToPar != null ? (scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar)) : '?'}. The leaderboard is heating up.`,
            timestamp: Date.now(),
          })
        }
      }

      // Big swing: 3+ stroke improvement in this round vs snapshot
      if (scoreToPar != null && prev?.scoreToPar != null) {
        const improvement = prev.scoreToPar - scoreToPar
        if (improvement >= 3) {
          const momentId = `${p.id}-swing-${currentRound}-${improvement}`
          if (!seenMomentsRef.current.has(momentId)) {
            seenMomentsRef.current.add(momentId)
            newMoments.push({
              id: momentId,
              golferName: p.name,
              type: 'big_swing',
              description: `${p.name} has moved ${improvement} shots in this round. The crowd is on its feet.`,
              timestamp: Date.now(),
            })
          }
        }
      }
    }

    // Update snapshot
    const newSnapshot = new Map<string, { holes: GolfHole[]; position: number | null; scoreToPar: number | null }>()
    for (const p of participants) {
      const meta = (p.metadata || {}) as Record<string, unknown>
      newSnapshot.set(p.id, {
        holes: (meta.holes as GolfHole[] | undefined) || [],
        position: meta.position as number | null,
        scoreToPar: meta.score_to_par as number | null,
      })
    }
    prevSnapshotRef.current = newSnapshot

    if (newMoments.length > 0) {
      setMoments(prev => [...newMoments, ...prev].slice(0, 20))
      // Trigger ripple for the first moment's golfer
      setRippleGolferId(newMoments[0].golferName)
      setTimeout(() => setRippleGolferId(null), 2000)
      // Play crowd roar sound with overlay
      playRoarWithOverlay(newMoments[0])
    }
  }, [participants, rosteredIds])

  // Run detection whenever participants change (realtime updates)
  useEffect(() => {
    // Skip initial render (no previous snapshot to compare)
    if (prevSnapshotRef.current.size === 0) {
      const initial = new Map<string, { holes: GolfHole[]; position: number | null; scoreToPar: number | null }>()
      for (const p of participants) {
        const meta = (p.metadata || {}) as Record<string, unknown>
        initial.set(p.id, {
          holes: (meta.holes as GolfHole[] | undefined) || [],
          position: meta.position as number | null,
          scoreToPar: meta.score_to_par as number | null,
        })
      }
      prevSnapshotRef.current = initial
      return
    }
    detectRoars()
  }, [participants, detectRoars])

  // TEMP TEST: fire a test roar 3 seconds after page load
  useEffect(() => {
    const testMoment: RoarMoment = {
      id: 'test-eagle-1',
      golferName: 'Rory McIlroy',
      type: 'eagle',
      description: 'Rory McIlroy eagles hole 13 (Azalea). The roar was heard from the 8th tee.',
      timestamp: Date.now(),
      holeNumber: 13,
    }
    const timer = setTimeout(() => {
      setMoments(prev => [testMoment, ...prev])
      playRoarWithOverlay(testMoment)
    }, 3000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [overlayMoment, setOverlayMoment] = useState<RoarMoment | null>(null)

  const playRoarWithOverlay = useCallback((moment?: RoarMoment) => {
    if (moment) setOverlayMoment(moment)
    playRoar()
    // Auto-dismiss overlay (~7.5s total)
    setTimeout(() => setOverlayMoment(null), 7500)
  }, [playRoar])

  const dismissOverlay = useCallback(() => {
    setOverlayMoment(null)
  }, [])

  return { moments, rippleGolferId, muted, toggleMute, playRoar: playRoarWithOverlay, overlayMoment, dismissOverlay }
}

/**
 * Renders roar moments in the activity feed style.
 */
/**
 * Full-screen overlay that appears with the roar sound.
 * Semi-transparent so the page is visible behind it.
 */
export function RoarOverlay({ moment, onDismiss }: {
  moment: RoarMoment | null
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (moment) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [moment])

  if (!moment) return null

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={onDismiss}
    >
      <div className="text-center px-6 max-w-lg">
        {/* Golden pulse ring */}
        <div className="mx-auto mb-6 relative w-20 h-20">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(201,168,76,0.3) 0%, transparent 70%)',
              animation: 'roarPulse 1.5s ease-out infinite',
            }}
          />
          <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <RoarIcon type={moment.type} />
          </div>
        </div>

        <p
          className="text-xl sm:text-2xl font-bold mb-2"
          style={{
            color: '#F5F0E8',
            fontFamily: 'Georgia, serif',
            textShadow: '0 0 30px rgba(201,168,76,.5)',
          }}
        >
          {moment.description}
        </p>

        <div
          className="text-[10px] uppercase tracking-[.2em] mt-4"
          style={{ color: '#C9A84C', opacity: 0.8 }}
        >
          Sunday Roar
          {moment.holeNumber && ` · Hole ${moment.holeNumber}`}
        </div>

        <div
          className="mx-auto mt-4"
          style={{
            width: 60,
            height: 1,
            background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
            opacity: 0.5,
          }}
        />
      </div>

      <style>{`
        @keyframes roarPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export function RoarFeed({ moments, muted, onToggleMute, onReplay }: {
  moments: RoarMoment[]
  muted: boolean
  onToggleMute: () => void
  onReplay: (moment: RoarMoment) => void
}) {
  if (moments.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C9A84C' }}>
          Sunday Roar
        </h4>
        <button
          onClick={onToggleMute}
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors"
          title={muted ? 'Unmute crowd roar' : 'Mute crowd roar'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {muted ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            )}
          </svg>
          {muted ? 'Muted' : 'Sound on'}
        </button>
      </div>
      {moments.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onReplay(m)}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer hover:brightness-110 transition-all"
          style={{
            background: 'rgba(201,168,76,0.08)',
            borderColor: 'rgba(201,168,76,0.25)',
            animation: 'fadeIn 0.5s ease-out',
          }}
          title="Click to replay the roar"
        >
          <div className="shrink-0 mt-0.5">
            <RoarIcon type={m.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary">{m.description}</p>
            <p className="text-[10px] text-text-muted mt-1">
              {formatTimeAgo(m.timestamp)}
              {m.holeNumber && ` · Hole ${m.holeNumber}`}
              {' · '}
              <span className="text-[#C9A84C]">tap to replay</span>
            </p>
          </div>
        </button>
      ))}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

function RoarIcon({ type }: { type: RoarMoment['type'] }) {
  const colors: Record<string, string> = {
    eagle: '#C9A84C',
    birdie_run: '#1a5c38',
    top5_move: '#C9A84C',
    big_swing: '#CC0000',
  }
  const color = colors[type] || '#C9A84C'

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center"
      style={{ background: `${color}20` }}
    >
      <svg className="w-3.5 h-3.5" fill={color} viewBox="0 0 24 24">
        {type === 'eagle' && (
          <path d="M12 2L9 9H2l6 4.5L5.5 22 12 17l6.5 5L16 13.5 22 9h-7z" />
        )}
        {type === 'birdie_run' && (
          <path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 4.42-3.58 8-8 8s-8-3.58-8-8c0-4.08 3.05-7.44 7-7.93V2.05C5.94 2.55 2 7.36 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-4.64-3.94-9.45-9-9.95zM11 7v6l5.25 3.15.75-1.23-4.5-2.67V7H11z" />
        )}
        {type === 'top5_move' && (
          <path d="M7 14l5-5 5 5H7z" />
        )}
        {type === 'big_swing' && (
          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
        )}
      </svg>
    </div>
  )
}

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
