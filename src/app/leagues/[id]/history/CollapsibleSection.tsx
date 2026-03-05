'use client'

import { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultExpanded?: boolean
  children: React.ReactNode
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} text-text-muted`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function CollapsibleSection({ title, defaultExpanded = true, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 md:px-6 py-3 flex items-center justify-between hover:bg-surface-subtle transition-colors"
      >
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">{title}</h2>
        <ChevronIcon open={isExpanded} />
      </button>
      {isExpanded && children}
    </div>
  )
}
