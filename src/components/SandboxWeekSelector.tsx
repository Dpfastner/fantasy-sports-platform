'use client'

import { useState, useEffect } from 'react'

// Cookie names must match the ones in src/lib/week.ts
const WEEK_OVERRIDE_COOKIE = 'sandbox_week_override'
const DATE_OVERRIDE_COOKIE = 'sandbox_date_override'
const TIME_OVERRIDE_COOKIE = 'sandbox_time_override'

interface Props {
  currentWeek: number
  environment: string
}

const DAYS = [
  { key: 'mon', label: 'Mon', description: 'Monday (start of week)' },
  { key: 'tue', label: 'Tue', description: 'Tuesday (before games)' },
  { key: 'wed', label: 'Wed', description: 'Wednesday (mid-week)' },
  { key: 'thu', label: 'Thu', description: 'Thursday (some games started)' },
  { key: 'fri', label: 'Fri', description: 'Friday (FCS/some FBS games)' },
  { key: 'sat', label: 'Sat', description: 'Saturday (main gameday)' },
  { key: 'sun', label: 'Sun', description: 'Sunday (after most games)' },
]

const TIME_PRESETS = [
  { key: '08:00', label: '8 AM', description: 'Early morning' },
  { key: '12:00', label: '12 PM', description: 'Noon (before kickoffs)' },
  { key: '15:00', label: '3 PM', description: 'Afternoon (games starting)' },
  { key: '19:00', label: '7 PM', description: 'Prime time' },
  { key: '23:00', label: '11 PM', description: 'Late night' },
]

export function SandboxWeekSelector({ currentWeek, environment }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Read current overrides from cookies on mount
  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [key, val] = c.trim().split('=')
      acc[key] = val
      return acc
    }, {} as Record<string, string>)

    if (cookies[DATE_OVERRIDE_COOKIE]) {
      setSelectedDay(cookies[DATE_OVERRIDE_COOKIE])
    }
    if (cookies[TIME_OVERRIDE_COOKIE]) {
      setSelectedTime(cookies[TIME_OVERRIDE_COOKIE])
    }
  }, [])

  // Don't render in production
  if (environment === 'production') {
    return null
  }

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    // Set cookie and reload
    document.cookie = `${WEEK_OVERRIDE_COOKIE}=${week}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
    window.location.reload()
  }

  const handleDayChange = (day: string) => {
    setSelectedDay(day)
    // Set cookie and reload
    document.cookie = `${DATE_OVERRIDE_COOKIE}=${day}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
    window.location.reload()
  }

  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
    // Set cookie and reload
    document.cookie = `${TIME_OVERRIDE_COOKIE}=${time}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
    window.location.reload()
  }

  const handleClearOverride = () => {
    document.cookie = `${WEEK_OVERRIDE_COOKIE}=; path=/; max-age=0`
    document.cookie = `${DATE_OVERRIDE_COOKIE}=; path=/; max-age=0`
    document.cookie = `${TIME_OVERRIDE_COOKIE}=; path=/; max-age=0`
    window.location.reload()
  }

  const weeks = Array.from({ length: 22 }, (_, i) => i) // 0-21
  const specialWeeks: Record<number, string> = {
    17: 'Bowls',
    18: 'R1',      // CFP First Round
    19: 'QF',      // CFP Quarterfinals
    20: 'SF',      // CFP Semifinals
    21: 'NC',      // National Championship
  }

  const getDayLabel = () => {
    if (!selectedDay) return ''
    const day = DAYS.find(d => d.key === selectedDay)
    const timeLabel = selectedTime ? ` ${selectedTime.replace(':00', '')}` : ''
    return day ? ` (${day.label}${timeLabel})` : ''
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-colors ${
          environment === 'sandbox' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'
        } text-white text-sm font-medium`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Week {currentWeek}{getDayLabel()}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Sandbox Time Override</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${
              environment === 'sandbox' ? 'bg-yellow-600/30 text-yellow-400' : 'bg-blue-600/30 text-blue-400'
            }`}>
              {environment}
            </span>
          </div>

          <p className="text-gray-400 text-xs mb-3">
            Override week and day for testing deadlines and game states.
          </p>

          {/* Week grid */}
          <div className="mb-3">
            <p className="text-gray-500 text-xs mb-1">Week</p>
            <div className="grid grid-cols-7 gap-1">
              {weeks.map(week => (
                <button
                  key={week}
                  onClick={() => handleWeekChange(week)}
                  className={`p-1.5 text-xs rounded transition-colors ${
                    week === currentWeek
                      ? 'bg-blue-600 text-white'
                      : week >= 17
                        ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={specialWeeks[week] || `Week ${week}`}
                >
                  {specialWeeks[week] ? specialWeeks[week].charAt(0) : week}
                </button>
              ))}
            </div>
          </div>

          {/* Day selector */}
          <div className="mb-3">
            <p className="text-gray-500 text-xs mb-1">Day (for deadline testing)</p>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(day => (
                <button
                  key={day.key}
                  onClick={() => handleDayChange(day.key)}
                  className={`p-1.5 text-xs rounded transition-colors ${
                    selectedDay === day.key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={day.description}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-[10px] mt-1">
              {selectedDay === 'mon' && 'Monday - start of week'}
              {selectedDay === 'tue' && 'Tuesday - before any games'}
              {selectedDay === 'wed' && 'Wednesday - mid-week'}
              {selectedDay === 'thu' && 'Thursday - some games started'}
              {selectedDay === 'fri' && 'Friday - FCS/some FBS games'}
              {selectedDay === 'sat' && 'Saturday - main gameday'}
              {selectedDay === 'sun' && 'Sunday - after most games'}
              {!selectedDay && 'Select a day to test deadline behavior'}
            </p>
          </div>

          {/* Time selector */}
          <div className="mb-3">
            <p className="text-gray-500 text-xs mb-1">Time (optional)</p>
            <div className="grid grid-cols-5 gap-1">
              {TIME_PRESETS.map(time => (
                <button
                  key={time.key}
                  onClick={() => handleTimeChange(time.key)}
                  className={`p-1.5 text-xs rounded transition-colors ${
                    selectedTime === time.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={time.description}
                >
                  {time.label}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-[10px] mt-1">
              {selectedTime && `Simulating ${selectedTime.replace(':00', ':00')} local time`}
              {!selectedTime && 'Defaults to 12 PM if not set'}
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span>0-16: Regular</span>
            <span className="text-orange-400">17: Bowls, 18-21: CFP</span>
          </div>

          {/* Clear button */}
          <button
            onClick={handleClearOverride}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
          >
            Clear Override (Use Real Date)
          </button>
        </div>
      )}
    </div>
  )
}
