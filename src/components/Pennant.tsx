'use client'

import { ensureContrast } from '@/lib/color-utils'

interface PennantSchool {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

interface PennantProps {
  school: PennantSchool
  variant?: 'pennant' | 'banner' | 'ribbon'
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { width: 120, height: 48, logo: 16, text: 'text-xs', gap: 'gap-1' },
  md: { width: 200, height: 64, logo: 24, text: 'text-sm', gap: 'gap-2' },
  lg: { width: 280, height: 80, logo: 32, text: 'text-base', gap: 'gap-2.5' },
} as const

export function Pennant({ school, variant = 'pennant', size = 'md' }: PennantProps) {
  const textColor = ensureContrast(school.primary_color, school.secondary_color)
  const s = SIZES[size]

  if (variant === 'banner') {
    return <BannerVariant school={school} textColor={textColor} size={size} />
  }

  if (variant === 'ribbon') {
    return <RibbonVariant school={school} textColor={textColor} s={s} />
  }

  return <PennantVariant school={school} textColor={textColor} s={s} />
}

/** Variant A — Classic horizontal triangle pennant */
function PennantVariant({ school, textColor, s }: { school: PennantSchool; textColor: string; s: typeof SIZES[keyof typeof SIZES] }) {
  return (
    <div className="inline-flex items-start">
      {/* Pole */}
      <div
        className="w-1 rounded-full shrink-0"
        style={{
          height: s.height + 8,
          backgroundColor: school.secondary_color,
        }}
      />
      {/* Pennant body */}
      <div
        className="animate-pennant-wave origin-top-left"
        style={{
          width: s.width,
          height: s.height,
          backgroundColor: school.primary_color,
          clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)',
        }}
      >
        <div className={`flex items-center ${s.gap} h-full px-2`}>
          <SchoolLogo school={school} size={s.logo} />
          <span
            className={`${s.text} font-bold truncate`}
            style={{ color: textColor }}
          >
            {school.name}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Variant B — Vertical hanging banner with fabric ripple effect */
function BannerVariant({ school, textColor, size }: { school: PennantSchool; textColor: string; size: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: { width: 56, height: 100, logo: 20, text: 'text-[10px]', ripples: 3 },
    md: { width: 72, height: 140, logo: 28, text: 'text-xs', ripples: 4 },
    lg: { width: 88, height: 180, logo: 36, text: 'text-sm', ripples: 5 },
  }
  const d = dims[size]

  return (
    <div className="inline-flex flex-col items-center">
      {/* Pole/rod */}
      <div
        className="rounded-full"
        style={{
          width: d.width + 8,
          height: 4,
          backgroundColor: school.secondary_color,
        }}
      />
      {/* Banner body — unfurls top-to-bottom on load */}
      <div
        className="animate-banner-unfurl origin-top relative overflow-hidden"
        style={{
          width: d.width,
          height: d.height,
          backgroundColor: school.primary_color,
        }}
      >
        {/* Fabric ripple lines — staggered horizontal creases */}
        {Array.from({ length: d.ripples }).map((_, i) => (
          <div
            key={i}
            className="banner-ripple absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${20 + (i * 60) / d.ripples}%`,
              height: 1,
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 80%, transparent 100%)`,
              animationDelay: `${1.2 + i * 0.3}s`,
            }}
          />
        ))}
        {/* Vertical fold highlight — subtle center crease */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none banner-fold"
          style={{
            left: '45%',
            width: '12%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)',
          }}
        />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-1 py-2">
          <SchoolLogo school={school} size={d.logo} />
          <span
            className={`${d.text} font-bold text-center mt-1 leading-tight`}
            style={{
              color: textColor,
              writingMode: d.width < 72 ? 'vertical-rl' : undefined,
              textOrientation: d.width < 72 ? 'mixed' : undefined,
            }}
          >
            {school.name}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Variant C — Horizontal ribbon/sash */
function RibbonVariant({ school, textColor, s }: { school: PennantSchool; textColor: string; s: typeof SIZES[keyof typeof SIZES] }) {
  return (
    <div
      className="animate-ribbon-flutter inline-flex items-center relative"
      style={{
        width: s.width,
        height: s.height * 0.7,
      }}
    >
      {/* Ribbon body */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          backgroundColor: school.primary_color,
          clipPath: 'polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)',
        }}
      />
      {/* Content */}
      <div className={`relative z-10 flex items-center ${s.gap} w-full justify-center px-4`}>
        <SchoolLogo school={school} size={s.logo} />
        <span
          className={`${s.text} font-bold truncate`}
          style={{ color: textColor }}
        >
          {school.name}
        </span>
      </div>
      {/* Border accent */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          border: `2px solid ${school.secondary_color}`,
          clipPath: 'polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)',
          opacity: 0.6,
        }}
      />
    </div>
  )
}

function SchoolLogo({ school, size }: { school: PennantSchool; size: number }) {
  if (school.logo_url) {
    return (
      <img
        src={school.logo_url}
        alt={school.name}
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: school.secondary_color,
        fontSize: size * 0.4,
      }}
    >
      {school.name.slice(0, 2).toUpperCase()}
    </div>
  )
}
