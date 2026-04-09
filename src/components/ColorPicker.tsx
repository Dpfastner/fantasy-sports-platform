'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ColorPickerProps {
  primaryColor: string
  secondaryColor: string
  onPrimaryChange: (color: string) => void
  onSecondaryChange: (color: string) => void
  favoriteSchoolId?: string // if provided, fetch school colors as default
}

const COLOR_PRESETS = [
  { primary: '#1a1a1a', secondary: '#ffffff', label: 'Classic' },
  { primary: '#1e3a5f', secondary: '#f0c040', label: 'Navy/Gold' },
  { primary: '#8b0000', secondary: '#ffffff', label: 'Crimson' },
  { primary: '#002244', secondary: '#c83803', label: 'Navy/Orange' },
  { primary: '#333f48', secondary: '#b3a369', label: 'Steel/Gold' },
  { primary: '#4b2e83', secondary: '#e8d3a2', label: 'Purple/Gold' },
  { primary: '#006747', secondary: '#cfc493', label: 'Green/Gold' },
  { primary: '#cc0033', secondary: '#000000', label: 'Red/Black' },
]

export default function ColorPicker({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  favoriteSchoolId,
}: ColorPickerProps) {
  // Fetch school colors when favoriteSchoolId is provided
  useEffect(() => {
    if (!favoriteSchoolId) return

    async function fetchSchoolColors() {
      // Only set defaults if colors are still the initial values
      if (primaryColor !== '#1a1a1a' || secondaryColor !== '#ffffff') return

      const supabase = createClient()
      const { data: school } = await supabase
        .from('schools')
        .select('primary_color, secondary_color')
        .eq('id', favoriteSchoolId)
        .single()

      if (school?.primary_color) onPrimaryChange(school.primary_color)
      if (school?.secondary_color) onSecondaryChange(school.secondary_color)
    }

    fetchSchoolColors()
    // Only run on mount / when favoriteSchoolId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteSchoolId])

  return (
    <div className="space-y-6">
      {/* Color Presets */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Color Presets</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => { onPrimaryChange(preset.primary); onSecondaryChange(preset.secondary) }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                primaryColor === preset.primary && secondaryColor === preset.secondary
                  ? 'border-brand bg-surface'
                  : 'border-border hover:border-text-muted'
              }`}
            >
              <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: preset.primary }} />
              <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: preset.secondary }} />
              <span className="text-text-secondary">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary / Secondary Color Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="primaryColor" className="block text-sm font-medium text-text-secondary mb-2">
            Primary Color
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              id="primaryColor"
              value={primaryColor}
              onChange={(e) => onPrimaryChange(e.target.value)}
              className="w-12 h-12 rounded border border-border cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label htmlFor="secondaryColor" className="block text-sm font-medium text-text-secondary mb-2">
            Secondary Color
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              id="secondaryColor"
              value={secondaryColor}
              onChange={(e) => onSecondaryChange(e.target.value)}
              className="w-12 h-12 rounded border border-border cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Preview</label>
        <div
          className="h-20 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: primaryColor, border: `3px solid ${secondaryColor}` }}
        >
          <span className="text-lg font-bold px-4 py-2 rounded" style={{ color: secondaryColor }}>
            Your Team Name
          </span>
        </div>
      </div>
    </div>
  )
}
