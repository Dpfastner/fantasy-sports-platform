'use client'

import { useState, useEffect } from 'react'

interface TournamentCountdownProps {
  startsAt: string
  label?: string
  tournamentName?: string
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

export function TournamentCountdown({ startsAt, label = 'Starts in', tournamentName }: TournamentCountdownProps) {
  const target = new Date(startsAt).getTime()
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(target))

  useEffect(() => {
    const tick = () => setTimeLeft(calculateTimeLeft(target))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target])

  if (!timeLeft) return null

  return (
    <div className="bg-brand-subtle border border-brand/20 rounded-lg p-4 mb-4">
      <div className="text-center">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
          {label}{tournamentName && ` · ${tournamentName}`}
        </div>
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <TimeUnit value={timeLeft.days} label="days" />
          <TimeDivider />
          <TimeUnit value={timeLeft.hours} label="hours" />
          <TimeDivider />
          <TimeUnit value={timeLeft.minutes} label="min" />
          <TimeDivider />
          <TimeUnit value={timeLeft.seconds} label="sec" />
        </div>
      </div>
    </div>
  )
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  )
}

function TimeDivider() {
  return <span className="text-xl sm:text-2xl font-bold text-brand/40">:</span>
}
