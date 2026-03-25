'use client'

import { useState, useEffect } from 'react'
import { Pennant } from './Pennant'
import { CopyButton } from './CopyButton'
import { ShareButton } from './ShareButton'
import { buildShareUrl } from '@/lib/share'
import { SITE_URL } from '@/lib/og/constants'
import Link from 'next/link'
import { SchoolPicker } from './SchoolPicker'

interface FanDistributionEntry {
  schoolName: string
  count: number
  color: string
  logoUrl: string | null
}

interface FanZoneWidgetProps {
  userSchool: {
    name: string
    abbreviation?: string | null
    logo_url: string | null
    primary_color: string
    secondary_color: string
  } | null
  fanDistribution: FanDistributionEntry[]
  totalFans: number
  rivalSchool: { name: string; count: number } | null
  referralUrl: string
  displayName: string
  userId: string
}

export function FanZoneWidget({
  userSchool,
  fanDistribution,
  totalFans,
  rivalSchool,
  referralUrl,
  displayName,
  userId,
}: FanZoneWidgetProps) {
  const [dismissed, setDismissed] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)
  const [savingSchool, setSavingSchool] = useState(false)

  const handleSaveSchool = async () => {
    if (!selectedSchoolId) return
    setSavingSchool(true)
    try {
      await fetch('/api/profile/favorite-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: selectedSchoolId }),
      })
      window.location.reload()
    } catch {
      setSavingSchool(false)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('rivyls_fan_zone_dismissed') === '1') {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('rivyls_fan_zone_dismissed', '1')
  }

  const handleRestore = () => {
    setDismissed(false)
    localStorage.removeItem('rivyls_fan_zone_dismissed')
  }

  if (dismissed) {
    return (
      <button
        onClick={handleRestore}
        className="text-sm text-text-muted hover:text-brand transition-colors flex items-center gap-1.5"
      >
        <span className="text-base">🏈</span>
        <span>Show Fan Zone</span>
      </button>
    )
  }

  const dismissButton = (
    <button
      onClick={handleDismiss}
      className="ml-auto p-1 text-text-muted hover:text-text-primary transition-colors"
      title="Dismiss Fan Zone"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )

  // No school set — show CTA
  if (!userSchool) {
    return (
      <div className="bg-surface rounded-lg p-6 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🏈</span>
          <h2 className="text-lg font-semibold text-text-primary">Fan Zone</h2>
          {dismissButton}
        </div>
        <p className="text-text-secondary text-sm mb-4">
          Pick your team to join the rivalry! Set your Alma Mater or favorite college team and see how your school stacks up against the competition.
        </p>
        <div className="max-w-sm">
          <SchoolPicker value={selectedSchoolId} onChange={setSelectedSchoolId} label="Pick your team" />
        </div>
        {selectedSchoolId && (
          <button
            onClick={handleSaveSchool}
            disabled={savingSchool}
            className="mt-3 bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {savingSchool ? 'Saving...' : 'Join the Rivalry!'}
          </button>
        )}
      </div>
    )
  }

  // Build conic-gradient for pie chart
  const gradientStops = buildConicGradient(fanDistribution, totalFans)

  // Build rivalry message
  const rivalryMessage = rivalSchool
    ? `Hey ${userSchool.name} fan! Are you going to let these ${rivalSchool.name} Rivyls outdo you? Invite your fellow ${userSchool.name} fans so your Rivyls don't win again!`
    : `Represent ${userSchool.name} on Rivyls! Invite fellow fans and grow your school's presence.`

  return (
    <div className="bg-surface rounded-lg p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🏈</span>
        <h2 className="text-lg font-semibold text-text-primary">Fan Zone</h2>
        {dismissButton}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Pie chart */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          {fanDistribution.length > 0 ? (
            <>
              <div
                className="rounded-full border-2 border-border"
                style={{
                  width: 140,
                  height: 140,
                  background: gradientStops,
                }}
              />
              {/* Legend — top 5 */}
              <div className="space-y-1">
                {fanDistribution.slice(0, 5).map(entry => (
                  <div key={entry.schoolName} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-text-secondary text-xs truncate max-w-[120px]">
                      {entry.schoolName}
                    </span>
                    <span className="text-text-muted text-xs">{entry.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="w-[140px] h-[140px] rounded-full bg-surface-subtle border-2 border-border flex items-center justify-center">
              <span className="text-text-muted text-xs text-center px-4">
                Be the first to rep your school!
              </span>
            </div>
          )}
        </div>

        {/* Right: Rivalry message + referral */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            <p className="text-text-primary text-sm leading-relaxed">
              {rivalryMessage}
            </p>
            {rivalSchool && (
              <p className="text-text-muted text-xs mt-2">
                {userSchool.name} fans: {fanDistribution.find(e => e.schoolName === userSchool.name)?.count || 1} &middot;{' '}
                {rivalSchool.name} fans: {rivalSchool.count}
              </p>
            )}
          </div>

          {/* Pennant + referral */}
          <div className="space-y-3">
            <Pennant school={userSchool} size="sm" />
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg text-text-secondary text-xs font-mono min-w-0"
              />
              <CopyButton text={referralUrl} />
              <ShareButton
                shareData={{
                  title: `Join Rivyls — Fantasy College Sports`,
                  text: `${displayName} wants you to rep ${userSchool.name} on Rivyls!`,
                  url: buildShareUrl(`/welcome?ref=${userId}`, { source: 'referral' }),
                }}
                ogImageUrl={`${SITE_URL}/api/og/referral?userId=${userId}`}
                label="Share"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildConicGradient(distribution: FanDistributionEntry[], total: number): string {
  if (distribution.length === 0 || total === 0) {
    return 'var(--palette-surface-subtle)'
  }

  const stops: string[] = []
  let currentDeg = 0

  for (const entry of distribution) {
    const sliceDeg = (entry.count / total) * 360
    stops.push(`${entry.color} ${currentDeg}deg ${currentDeg + sliceDeg}deg`)
    currentDeg += sliceDeg
  }

  // Fill remaining with muted color (for "other" schools)
  if (currentDeg < 360) {
    stops.push(`var(--palette-surface-inset, #374151) ${currentDeg}deg 360deg`)
  }

  return `conic-gradient(${stops.join(', ')})`
}
