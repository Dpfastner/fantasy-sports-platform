'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface School {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  primary_color: string
}

interface SchoolPickerProps {
  value: string | null
  onChange: (schoolId: string | null) => void
  label?: string
}

export function SchoolPicker({ value, onChange, label = 'Favorite FBS Team' }: SchoolPickerProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedSchool = schools.find(s => s.id === value) || null

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('schools')
      .select('id, name, abbreviation, logo_url, conference, primary_color')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setSchools(data || [])
        setLoading(false)
      })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  const filtered = search.length >= 1
    ? schools.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.abbreviation && s.abbreviation.toLowerCase().includes(search.toLowerCase()))
      )
    : schools

  const handleSelect = (school: School) => {
    onChange(school.id)
    setSearch('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setSearch('')
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-text-secondary text-sm mb-1">
        {label} <span className="text-text-muted text-xs">(optional)</span>
      </label>

      {selectedSchool ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg">
          {selectedSchool.logo_url && (
            <img
              src={selectedSchool.logo_url}
              alt=""
              className="w-5 h-5 object-contain"
            />
          )}
          <span className="text-text-primary text-sm flex-1">{selectedSchool.name}</span>
          <span className="text-text-muted text-xs">{selectedSchool.conference}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand"
            placeholder={loading ? 'Loading schools...' : 'Search for a school...'}
            disabled={loading}
          />

          {open && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-text-muted text-sm">
                  {search ? 'No schools found' : 'Type to search...'}
                </div>
              ) : (
                filtered.map(school => (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => handleSelect(school)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-surface-subtle transition-colors"
                  >
                    {school.logo_url ? (
                      <img src={school.logo_url} alt="" className="w-5 h-5 object-contain shrink-0" />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: school.primary_color }}
                      >
                        {(school.abbreviation || school.name[0]).slice(0, 2)}
                      </div>
                    )}
                    <span className="text-text-primary text-sm flex-1 truncate">{school.name}</span>
                    <span className="text-text-muted text-xs shrink-0">{school.conference}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
