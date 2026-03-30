'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase/client'
import { ShareButton } from './ShareButton'
import { buildShareUrl } from '@/lib/share'
import { SITE_URL } from '@/lib/og/constants'

interface BadgeData {
  id: string
  label: string
  description: string
  fallbackIcon: string
  iconUrl: string | null
  color: string
  bgColor: string
}

const FALLBACK_ICONS: Record<string, string> = {
  star: '\u2606',
  trophy: '\uD83C\uDFC6',
  medal: '\uD83C\uDFC5',
  flag: '\uD83D\uDEA9',
  crown: '\uD83D\uDC51',
}

/** Play a short ascending fanfare using Web Audio API */
function playFanfare() {
  try {
    const ctx = new AudioContext()
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    const duration = 0.15

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * duration)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * duration + duration * 2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * duration)
      osc.stop(ctx.currentTime + i * duration + duration * 2)
    })

    // Final sustained note
    const final = ctx.createOscillator()
    const finalGain = ctx.createGain()
    final.type = 'triangle'
    final.frequency.value = 1046.50
    finalGain.gain.setValueAtTime(0.25, ctx.currentTime + notes.length * duration)
    finalGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + notes.length * duration + 0.6)
    final.connect(finalGain)
    finalGain.connect(ctx.destination)
    final.start(ctx.currentTime + notes.length * duration)
    final.stop(ctx.currentTime + notes.length * duration + 0.6)
  } catch {
    // Audio not supported or blocked — continue without sound
  }
}

/** Fire confetti burst from the top center */
function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  confetti({ ...defaults, particleCount: 50, origin: { x: 0.5, y: 0 } })

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.3, y: 0.1 } })
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.7, y: 0.1 } })
  }, 200)

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 20, origin: { x: 0.4, y: 0.05 }, colors: ['#F59E0B', '#FAF5EE', '#F59E0B'] })
    confetti({ ...defaults, particleCount: 20, origin: { x: 0.6, y: 0.05 }, colors: ['#F59E0B', '#FAF5EE', '#F59E0B'] })
  }, 400)
}

export function BadgeCelebration() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const celebrateId = searchParams.get('celebrate')
  const [badge, setBadge] = useState<BadgeData | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!celebrateId) return

    const supabase = createClient()
    supabase
      .from('user_badges')
      .select('id, badge_definitions(label, description, fallback_icon, icon_url, color, bg_color)')
      .eq('id', celebrateId)
      .single()
      .then(({ data }: { data: any }) => {
        if (!data?.badge_definitions) return
        const def = data.badge_definitions
        setBadge({
          id: data.id,
          label: def.label,
          description: def.description,
          fallbackIcon: def.fallback_icon || 'trophy',
          iconUrl: def.icon_url,
          color: def.color || '#F59E0B',
          bgColor: def.bg_color || '#1A0F28',
        })
        setShow(true)

        // Delay effects slightly so modal is visible first
        setTimeout(() => {
          fireConfetti()
          playFanfare()
        }, 300)
      })
  }, [celebrateId])

  const handleDismiss = useCallback(() => {
    setShow(false)
    // Remove ?celebrate param from URL without full navigation
    const url = new URL(window.location.href)
    url.searchParams.delete('celebrate')
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  if (!show || !badge) return null

  const icon = badge.iconUrl
    ? null
    : FALLBACK_ICONS[badge.fallbackIcon] || FALLBACK_ICONS.trophy

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={handleDismiss}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-scale-in my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Badge icon */}
        <div
          className="mx-auto w-28 h-28 rounded-full flex items-center justify-center mb-5 border-4 animate-pulse"
          style={{
            borderColor: badge.color,
            backgroundColor: badge.bgColor,
            boxShadow: `0 0 30px ${badge.color}40, 0 0 60px ${badge.color}20`,
          }}
        >
          {badge.iconUrl ? (
            <img src={badge.iconUrl} alt="" className="w-16 h-16 object-contain" />
          ) : (
            <span className="text-5xl">{icon}</span>
          )}
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-text-primary mb-1">Congratulations!</h2>
        <h3 className="text-lg font-semibold mb-2" style={{ color: badge.color }}>
          {badge.label}
        </h3>
        <p className="text-text-secondary text-sm mb-6">{badge.description}</p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <ShareButton
            shareData={{
              title: `I earned the ${badge.label} badge on Rivyls!`,
              text: badge.description,
              url: buildShareUrl('/profile', { source: 'badge', campaign: badge.label.toLowerCase().replace(/\s+/g, '-') }),
            }}
            ogImageUrl={`${SITE_URL}/api/og/badge?badgeId=${badge.id}`}
            label="Share Badge"
          />
          <button
            onClick={handleDismiss}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  )
}
