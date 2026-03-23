'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SchoolPicker } from './SchoolPicker'
import { Pennant } from './Pennant'
import { CopyButton } from './CopyButton'
import Link from 'next/link'

interface SchoolData {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

export function HeaderSchoolBadge({ userId }: { userId: string }) {
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [fanCount, setFanCount] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fetch user's school data
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, favorite_school_id')
        .eq('id', userId)
        .single()

      if (!profile) { setLoaded(true); return }
      setDisplayName(profile.display_name || '')
      setSchoolId(profile.favorite_school_id)

      if (profile.favorite_school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name, logo_url, primary_color, secondary_color')
          .eq('id', profile.favorite_school_id)
          .single()
        setSchool(schoolData)

        // Count fans for this school
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('favorite_school_id', profile.favorite_school_id)
        setFanCount(count || 0)
      }
      setLoaded(true)
    }
    load()
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowPicker(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  const handleSchoolSelect = async (newSchoolId: string | null) => {
    if (!newSchoolId) return
    const res = await fetch('/api/profile/favorite-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, schoolId: newSchoolId }),
    })
    if (res.ok) {
      setSchoolId(newSchoolId)
      setShowPicker(false)
      // Re-fetch school data
      const supabase = createClient()
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name, logo_url, primary_color, secondary_color')
        .eq('id', newSchoolId)
        .single()
      setSchool(schoolData)
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('favorite_school_id', newSchoolId)
      setFanCount(count || 0)
    }
  }

  if (!loaded) return null

  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/welcome?ref=${userId}`

  // No school set
  if (!school) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => { setIsOpen(!isOpen); setShowPicker(true) }}
          className="text-xs text-text-muted hover:text-brand transition-colors whitespace-nowrap hidden sm:block"
        >
          Pick a team
        </button>
        {isOpen && showPicker && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-lg shadow-lg p-3 z-50">
            <p className="text-xs text-text-secondary mb-2">Set your favorite FBS team</p>
            <SchoolPicker value={schoolId} onChange={handleSchoolSelect} label="" />
          </div>
        )}
      </div>
    )
  }

  // School set — ring badge
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-center hover:opacity-80 transition-opacity" title={school.name}>
        {school.logo_url ? (
          <img
            src={school.logo_url}
            alt={school.name}
            className="w-6 h-6 rounded-full object-contain"
            style={{ border: `2px solid ${school.primary_color}` }}
          />
        ) : (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: school.primary_color, color: school.secondary_color, border: `2px solid ${school.secondary_color}` }}
          >
            {school.name.charAt(0)}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-lg py-3 z-50">
          {/* School info */}
          <div className="px-4 pb-3 border-b border-border">
            <Pennant school={school} size="xs" variant="pennant" />
            <p className="text-xs text-text-muted mt-1.5">{fanCount} fan{fanCount !== 1 ? 's' : ''} on Rivyls</p>
          </div>

          {/* Referral */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-text-secondary mb-2">Invite fans to rep {school.name}</p>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 px-2 py-1 bg-surface-subtle border border-border rounded text-text-secondary text-[10px] font-mono min-w-0"
              />
              <CopyButton text={referralUrl} label="Copy" />
            </div>
          </div>

          {/* Links */}
          <div className="px-4 pt-2 space-y-1">
            <Link
              href="/settings"
              className="block text-xs text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Change team
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
