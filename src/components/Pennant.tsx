'use client'

import { ensureContrast, isLightColor } from '@/lib/color-utils'

interface PennantSchool {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

interface PennantProps {
  school: PennantSchool
  variant?: 'pennant' | 'banner' | 'ribbon'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  colorScheme?: 'primary' | 'alternate'
  onClick?: () => void
  interactive?: boolean
}

const SIZES = {
  xs: { minWidth: 80, height: 32, logo: 12, text: 'text-[9px]', gap: 'gap-0.5' },
  sm: { minWidth: 120, height: 48, logo: 16, text: 'text-xs', gap: 'gap-1' },
  md: { minWidth: 200, height: 64, logo: 24, text: 'text-sm', gap: 'gap-2' },
  lg: { minWidth: 280, height: 80, logo: 32, text: 'text-base', gap: 'gap-2.5' },
} as const

/**
 * Pick the best bg/accent pairing.
 * - 'primary' (default): darker color as background
 * - 'alternate': force swap — lighter/accent color as background
 */
function resolveColors(school: PennantSchool, colorScheme: 'primary' | 'alternate' = 'primary') {
  const primaryIsLight = isLightColor(school.primary_color)

  let bgColor: string
  let accentColor: string

  if (colorScheme === 'alternate') {
    // Force the opposite of the default
    bgColor = primaryIsLight ? school.primary_color : school.secondary_color
    accentColor = primaryIsLight ? school.secondary_color : school.primary_color
  } else {
    // Default: darker color as background
    bgColor = primaryIsLight ? school.secondary_color : school.primary_color
    accentColor = primaryIsLight ? school.primary_color : school.secondary_color
  }

  const textColor = ensureContrast(bgColor, accentColor)
  return { bgColor, accentColor, textColor }
}

export function Pennant({ school, variant = 'pennant', size = 'md', colorScheme = 'primary', onClick, interactive }: PennantProps) {
  const colors = resolveColors(school, colorScheme)
  const s = SIZES[size]
  const wrapperClass = interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''

  const content = variant === 'banner'
    ? <BannerVariant school={school} colors={colors} size={size} />
    : variant === 'ribbon'
    ? <RibbonVariant school={school} colors={colors} s={s} />
    : <PennantVariant school={school} colors={colors} s={s} />

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`inline-block ${wrapperClass}`}>
        {content}
      </button>
    )
  }

  return content
}

interface ResolvedColors {
  bgColor: string
  accentColor: string
  textColor: string
}

/** Variant A — Classic horizontal triangle pennant */
function PennantVariant({ school, colors, s }: { school: PennantSchool; colors: ResolvedColors; s: typeof SIZES[keyof typeof SIZES] }) {
  return (
    <div className="inline-flex items-start">
      {/* Pole */}
      <div
        className="w-1 rounded-full shrink-0"
        style={{
          height: s.height + 8,
          backgroundColor: colors.accentColor,
        }}
      />
      {/* Pennant body */}
      <div
        className="animate-pennant-wave origin-top-left"
        style={{
          minWidth: s.minWidth,
          height: s.height,
          backgroundColor: colors.bgColor,
          clipPath: 'polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)',
        }}
      >
        <div className={`flex items-center ${s.gap} h-full px-2 pr-[18%]`}>
          <SchoolLogo school={school} size={s.logo} />
          <span
            className={`${s.text} font-bold whitespace-nowrap`}
            style={{ color: colors.textColor }}
          >
            {school.name}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Variant B — Vertical hanging banner with 3D fabric effect */
function BannerVariant({ school, colors, size }: { school: PennantSchool; colors: ResolvedColors; size: 'xs' | 'sm' | 'md' | 'lg' }) {
  const dims = {
    xs: { width: 36, minHeight: 64, logo: 14, text: 'text-[8px]', ripples: 2 },
    sm: { width: 56, minHeight: 100, logo: 20, text: 'text-[10px]', ripples: 3 },
    md: { width: 72, minHeight: 140, logo: 28, text: 'text-xs', ripples: 4 },
    lg: { width: 88, minHeight: 180, logo: 36, text: 'text-sm', ripples: 5 },
  }
  const d = dims[size]

  return (
    <div className="inline-flex flex-col items-center" style={{ perspective: 400 }}>
      {/* Pole/rod — 3D cylinder look */}
      <div
        className="rounded-full relative"
        style={{
          width: d.width + 8,
          height: 6,
          background: `linear-gradient(180deg, ${colors.accentColor}, ${colors.accentColor}88 60%, ${colors.accentColor}44)`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.3)`,
        }}
      />
      {/* Banner body — 3D fabric with perspective */}
      <div
        className="animate-banner-unfurl origin-top relative"
        style={{
          width: d.width,
          minHeight: d.minHeight,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Base fabric color */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: colors.bgColor }}
        />

        {/* 3D cylindrical shading — left-to-right lighting gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg,
              rgba(0,0,0,0.18) 0%,
              rgba(0,0,0,0.06) 15%,
              rgba(255,255,255,0.08) 30%,
              rgba(255,255,255,0.12) 45%,
              rgba(255,255,255,0.04) 55%,
              rgba(0,0,0,0.04) 70%,
              rgba(0,0,0,0.14) 100%)`,
          }}
        />

        {/* 3D fabric wave — vertical undulation overlay */}
        <div
          className="absolute inset-0 pointer-events-none banner-fabric-wave"
          style={{
            background: `repeating-linear-gradient(90deg,
              rgba(0,0,0,0.06) 0px,
              transparent 4px,
              rgba(255,255,255,0.06) 8px,
              transparent 12px,
              rgba(0,0,0,0.04) 16px)`,
          }}
        />

        {/* Horizontal fabric folds — 3D creases with shadow/highlight pairs */}
        {Array.from({ length: d.ripples }).map((_, i) => {
          const yPos = 20 + (i * 60) / d.ripples
          return (
            <div key={i} className="banner-ripple absolute left-0 right-0 pointer-events-none" style={{ animationDelay: `${1.2 + i * 0.3}s` }}>
              {/* Shadow above crease */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: `${yPos - 1.5}%`,
                  height: 3,
                  background: `linear-gradient(90deg,
                    transparent 5%,
                    rgba(0,0,0,0.12) 20%,
                    rgba(0,0,0,0.18) 50%,
                    rgba(0,0,0,0.12) 80%,
                    transparent 95%)`,
                  position: 'absolute',
                }}
              />
              {/* Highlight below crease */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: `${yPos + 0.5}%`,
                  height: 2,
                  background: `linear-gradient(90deg,
                    transparent 5%,
                    rgba(255,255,255,0.15) 20%,
                    rgba(255,255,255,0.25) 50%,
                    rgba(255,255,255,0.15) 80%,
                    transparent 95%)`,
                  position: 'absolute',
                }}
              />
            </div>
          )
        })}

        {/* Center fold crease — subtle 3D ridge */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none banner-fold"
          style={{
            left: '46%',
            width: '8%',
            background: `linear-gradient(90deg,
              rgba(0,0,0,0.04),
              rgba(255,255,255,0.08) 48%,
              rgba(255,255,255,0.03) 52%,
              rgba(0,0,0,0.03))`,
          }}
        />

        {/* Edge shadows for 3D depth */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{
            width: '8%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.2), transparent)',
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{
            width: '8%',
            background: 'linear-gradient(270deg, rgba(0,0,0,0.15), transparent)',
          }}
        />

        {/* Top shadow — fabric drapes from rod */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: '12%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15), transparent)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-1 py-2">
          <SchoolLogo school={school} size={d.logo} />
          <span
            className={`${d.text} font-bold text-center mt-1 leading-tight`}
            style={{
              color: colors.textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
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
function RibbonVariant({ school, colors, s }: { school: PennantSchool; colors: ResolvedColors; s: typeof SIZES[keyof typeof SIZES] }) {
  return (
    <div
      className="animate-ribbon-flutter inline-flex items-center relative"
      style={{
        minWidth: s.minWidth,
        height: s.height * 0.7,
      }}
    >
      {/* Ribbon body */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          backgroundColor: colors.bgColor,
          clipPath: 'polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)',
        }}
      />
      {/* Content */}
      <div className={`relative z-10 flex items-center ${s.gap} w-full justify-center px-4`}>
        <SchoolLogo school={school} size={s.logo} />
        <span
          className={`${s.text} font-bold whitespace-nowrap`}
          style={{ color: colors.textColor }}
        >
          {school.name}
        </span>
      </div>
      {/* Border accent */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          border: `2px solid ${colors.accentColor}`,
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
        style={{
          width: size,
          height: size,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        }}
      />
    )
  }

  const { bgColor, accentColor } = resolveColors(school, 'primary')
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: accentColor,
        color: ensureContrast(accentColor, bgColor),
        fontSize: size * 0.4,
      }}
    >
      {school.name.slice(0, 2).toUpperCase()}
    </div>
  )
}
