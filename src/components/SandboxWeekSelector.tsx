'use client'

import { useState, useEffect } from 'react'
import { getWeekOverrideCookieName } from '@/lib/week'

interface Props {
  currentWeek: number
  environment: string
}

export function SandboxWeekSelector({ currentWeek, environment }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek)

  // Don't render in production
  if (environment === 'production') {
    return null
  }

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week)
    // Set cookie and reload
    document.cookie = `${getWeekOverrideCookieName()}=${week}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
    window.location.reload()
  }

  const handleClearOverride = () => {
    document.cookie = `${getWeekOverrideCookieName()}=; path=/; max-age=0`
    window.location.reload()
  }

  const weeks = Array.from({ length: 21 }, (_, i) => i) // 0-20
  const specialWeeks: Record<number, string> = {
    17: 'Bowls',
    18: 'CFP',
    19: 'Semis',
    20: 'Natty',
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
        Week {currentWeek}
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
        <div className="absolute bottom-12 right-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Sandbox Week Override</h3>
            <span className={`text-xs px-2 py-0.5 rounded ${
              environment === 'sandbox' ? 'bg-yellow-600/30 text-yellow-400' : 'bg-blue-600/30 text-blue-400'
            }`}>
              {environment}
            </span>
          </div>

          <p className="text-gray-400 text-xs mb-3">
            Override the current week for testing. This affects all pages.
          </p>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
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

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span>0-16: Regular</span>
            <span className="text-orange-400">17+: Postseason</span>
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
