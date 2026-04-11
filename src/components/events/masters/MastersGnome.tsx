'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface MastersGnomeProps {
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

/**
 * Original illustrated golf gnome — Augusta-inspired but original art.
 * Garden gnome in green golf attire with white beard, green cap,
 * dark vest, striped polo, khaki pants, green/white umbrella, and a cup.
 */
export function MastersGnome({ className, style, onClick }: MastersGnomeProps) {
  return (
    <div className={className} style={{ cursor: onClick ? 'pointer' : 'default', ...style }} onClick={onClick}>
      <svg viewBox="0 0 200 340" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        {/* ── Base / feet platform ── */}
        <ellipse cx="100" cy="330" rx="52" ry="10" fill="#4a6b3a" />

        {/* ── Shoes ── */}
        {/* Left shoe */}
        <path d="M62 315 Q55 315 50 320 Q46 325 48 330 L78 330 L78 318 Q72 315 62 315Z" fill="#1a5c38" />
        <path d="M50 320 Q48 322 48 325" stroke="#145030" strokeWidth="1" fill="none" />
        {/* Right shoe */}
        <path d="M122 315 Q130 315 135 320 Q139 325 137 330 L107 330 L107 318 Q113 315 122 315Z" fill="#fff" />
        <path d="M107 322 L137 322" stroke="#e8e4da" strokeWidth="0.5" />

        {/* ── Khaki pants ── */}
        <path d="M68 250 L62 315 L82 318 L90 260Z" fill="#E8DCC8" />
        <path d="M118 250 L122 315 L105 318 L98 260Z" fill="#E8DCC8" />
        {/* Belt */}
        <rect x="65" y="245" width="58" height="8" rx="2" fill="#2C3E2D" />
        <rect x="90" y="244" width="10" height="10" rx="1.5" fill="#C9A84C" /> {/* Belt buckle */}

        {/* ── Striped polo (visible below vest) ── */}
        <path d="M65 180 L60 248 L128 248 L122 180Z" fill="#d4e8d4" />
        {/* Horizontal stripes */}
        <line x1="62" y1="195" x2="126" y2="195" stroke="#1a5c38" strokeWidth="1.5" opacity="0.3" />
        <line x1="61" y1="205" x2="127" y2="205" stroke="#1a5c38" strokeWidth="1.5" opacity="0.3" />
        <line x1="61" y1="215" x2="127" y2="215" stroke="#1a5c38" strokeWidth="1.5" opacity="0.3" />
        <line x1="60" y1="225" x2="128" y2="225" stroke="#1a5c38" strokeWidth="1.5" opacity="0.3" />
        <line x1="60" y1="235" x2="128" y2="235" stroke="#1a5c38" strokeWidth="1.5" opacity="0.3" />

        {/* ── Dark vest ── */}
        <path d="M68 178 L63 240 L90 245 L90 178Z" fill="#1c2638" />
        <path d="M120 178 L125 240 L98 245 L98 178Z" fill="#1c2638" />
        {/* Vest pocket */}
        <rect x="72" y="195" width="14" height="10" rx="1.5" fill="#151e2e" stroke="#2a3548" strokeWidth="0.5" />
        {/* Vest zipper line */}
        <line x1="94" y1="180" x2="94" y2="245" stroke="#2a3548" strokeWidth="1" />

        {/* ── Collar ── */}
        <path d="M76 175 L82 168 L94 172 L106 168 L112 175" fill="#d4e8d4" stroke="#b8d4b8" strokeWidth="0.5" />

        {/* ── Arms ── */}
        {/* Left arm (holding umbrella) */}
        <path d="M65 185 L42 220 L38 260 L45 262 L52 225 L68 200Z" fill="#E8C4A0" />
        {/* Left sleeve */}
        <path d="M65 185 L50 210 L58 215 L68 195Z" fill="#1c2638" />

        {/* Right arm (holding cup) */}
        <path d="M122 185 L142 225 L148 255 L140 258 L135 228 L120 200Z" fill="#E8C4A0" />
        {/* Right sleeve */}
        <path d="M122 185 L138 215 L130 218 L120 198Z" fill="#1c2638" />

        {/* ── Hands ── */}
        {/* Left hand */}
        <circle cx="40" cy="261" r="6" fill="#E8C4A0" />
        {/* Right hand */}
        <circle cx="145" cy="256" r="6" fill="#E8C4A0" />

        {/* ── Cup in right hand ── */}
        <path d="M138 240 L135 260 L155 260 L152 240Z" fill="#1a5c38" />
        <ellipse cx="145" cy="240" rx="9" ry="3" fill="#145030" />
        {/* Cup logo area */}
        <rect x="140" y="246" width="10" height="6" rx="1" fill="#C9A84C" opacity="0.6" />

        {/* ── Umbrella (closed, in left hand) ── */}
        <line x1="38" y1="160" x2="40" y2="262" stroke="#666" strokeWidth="2.5" />
        {/* Umbrella canopy (closed/furled) */}
        <path d="M34 160 Q38 148 42 160 L42 200 Q38 202 34 200Z" fill="#1a5c38" />
        <path d="M36 160 Q38 152 40 160 L40 200 Q38 201 36 200Z" fill="#fff" />
        {/* Umbrella tip */}
        <circle cx="38" cy="157" r="2" fill="#666" />
        {/* Umbrella handle */}
        <path d="M38 262 Q32 268 38 274" stroke="#666" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* ── Head / Face ── */}
        <ellipse cx="94" cy="148" rx="32" ry="36" fill="#E8C4A0" />

        {/* ── White beard ── */}
        <path d="M66 155 Q60 170 65 190 Q75 210 94 215 Q113 210 123 190 Q128 170 122 155 Q110 160 94 162 Q78 160 66 155Z" fill="#fff" />
        {/* Beard texture */}
        <path d="M72 170 Q78 175 74 185" stroke="#e8e4da" strokeWidth="1" fill="none" />
        <path d="M84 172 Q88 180 85 192" stroke="#e8e4da" strokeWidth="1" fill="none" />
        <path d="M96 173 Q98 182 96 195" stroke="#e8e4da" strokeWidth="1" fill="none" />
        <path d="M108 172 Q112 180 110 190" stroke="#e8e4da" strokeWidth="1" fill="none" />
        <path d="M118 168 Q120 175 118 185" stroke="#e8e4da" strokeWidth="1" fill="none" />

        {/* ── Mustache ── */}
        <path d="M78 152 Q86 158 94 152 Q102 158 110 152" fill="#fff" stroke="#e8e4da" strokeWidth="0.5" />

        {/* ── Nose ── */}
        <ellipse cx="94" cy="148" rx="6" ry="5" fill="#d4a88c" />
        <ellipse cx="92" cy="146" rx="2" ry="1.5" fill="#e0b8a0" opacity="0.5" />

        {/* ── Eyes ── */}
        <ellipse cx="80" cy="138" rx="4" ry="4.5" fill="#fff" />
        <ellipse cx="108" cy="138" rx="4" ry="4.5" fill="#fff" />
        <circle cx="81" cy="139" r="2.5" fill="#4a3520" />
        <circle cx="109" cy="139" r="2.5" fill="#4a3520" />
        <circle cx="82" cy="138" r="1" fill="#fff" /> {/* Eye highlight */}
        <circle cx="110" cy="138" r="1" fill="#fff" />

        {/* ── Eyebrows ── */}
        <path d="M74 132 Q80 128 86 132" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M102 132 Q108 128 114 132" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* ── Cheeks ── */}
        <circle cx="72" cy="148" r="6" fill="#d4988c" opacity="0.3" />
        <circle cx="116" cy="148" r="6" fill="#d4988c" opacity="0.3" />

        {/* ── Green cap ── */}
        <path d="M58 130 Q60 108 94 105 Q128 108 130 130 Q115 128 94 126 Q73 128 58 130Z" fill="#1a5c38" />
        {/* Cap brim */}
        <path d="M55 130 Q50 132 48 128 Q54 118 94 115 Q134 118 140 128 Q138 132 133 130 Q115 128 94 126 Q73 128 55 130Z" fill="#145030" />
        {/* Cap highlight */}
        <path d="M70 115 Q82 110 100 112" stroke="#267a4c" strokeWidth="1.5" fill="none" opacity="0.4" />
        {/* Cap button */}
        <circle cx="94" cy="105" r="3" fill="#145030" />

        {/* ── Cap logo area (generic, no Masters branding) ── */}
        <rect x="80" y="116" width="12" height="6" rx="1" fill="#C9A84C" opacity="0.5" />

        {/* ── Ears ── */}
        <ellipse cx="60" cy="142" rx="5" ry="7" fill="#E8C4A0" />
        <ellipse cx="128" cy="142" rx="5" ry="7" fill="#E8C4A0" />
        <ellipse cx="60" cy="142" rx="3" ry="4" fill="#d4a88c" opacity="0.3" />
        <ellipse cx="128" cy="142" rx="3" ry="4" fill="#d4a88c" opacity="0.3" />
      </svg>
    </div>
  )
}

const MASTERS_FACTS = [
  "The pimento cheese sandwich has been sold at Augusta since 1947. It costs $1.50.",
  "Magnolia Lane is 330 yards long, flanked by 61 magnolia trees on each side — 122 total.",
  "The Crow's Nest is a 30×40ft dorm room at the top of the clubhouse. It has 5 beds and a ladder to the cupola.",
  "No winner of the Wednesday Par 3 Contest has ever won The Masters in the same year.",
  "The green jacket was first awarded in 1949. Champions keep it for one year, then it returns to the clubhouse.",
  "Augusta National has no rough — only 'first cut' and 'second cut' of fairway.",
  "Rae's Creek is named after John Rae, who settled the area in the 1700s.",
  "The original 12th green was 25 yards to the right of the current location.",
  "Augusta National was built on a 365-acre plot that was formerly an indigo plantation and then a nursery.",
  "The Masters trophy is a sterling silver scale model of the Augusta National clubhouse, weighing 132 pounds.",
  "Gene Sarazen's 1935 double eagle on the 15th hole — 'the shot heard round the world' — made the tournament famous.",
  "The wait list for annual patron badges closed in 1978. It briefly reopened in 2000, then closed permanently.",
]

/**
 * Gnome easter egg — pokes out from behind the scoreboard.
 * Click to see a popover with a random Masters fun fact (same style as pimento cheese / crow's nest).
 */
export function GnomeEasterEgg() {
  const [showPopover, setShowPopover] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [factIndex] = useState(() => Math.floor(Math.random() * MASTERS_FACTS.length))

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
  }, [])

  useEffect(() => {
    if (!showPopover) return
    updatePos()
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [showPopover, updatePos])

  return (
    <>
      <div
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setShowPopover(!showPopover) }}
        style={{
          position: 'absolute',
          bottom: 16,
          right: -14,
          width: 30,
          height: 50,
          cursor: 'pointer',
          zIndex: 20,
          transition: 'transform 0.2s',
        }}
        className="hover:scale-110"
        title="What's this?"
      >
        <MastersGnome style={{ width: '100%', height: '100%' }} />
      </div>

      {showPopover && pos && (
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div style={{
            background: '#FAF6EE',
            border: '1px solid rgba(201,168,76,.3)',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,.15)',
            width: 280,
          }}>
            <p style={{ fontWeight: 700, color: '#1a5c38', marginBottom: 4, fontSize: 12 }}>
              You found the gnome!
            </p>
            <p style={{ color: '#8B7355', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              Masters Fun Fact
            </p>
            <p style={{ color: '#4a4a4a', fontSize: 11, lineHeight: 1.5 }}>
              {MASTERS_FACTS[factIndex]}
            </p>
            <p style={{ color: '#8B7355', fontSize: 11, fontStyle: 'italic', marginTop: 6 }}>
              Augusta National began selling a limited Masters Gnome in 2016 (~$40). It sells out within minutes.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
