/**
 * Shared OG card layout for all share card images.
 * Uses inline styles (Satori requirement — no Tailwind, no CSS Grid).
 *
 * Layout:
 * ┌──────────────────────────────────────┐
 * │  RIVYLS                   gold bar   │
 * │──────────────────────────────────────│
 * │         [CONTENT SLOT]               │
 * │──────────────────────────────────────│
 * │  rivyls.com            call-to-action│
 * └──────────────────────────────────────┘
 */

import { OG } from './constants'

interface CardLayoutProps {
  children: React.ReactNode
  footerText?: string
}

export function CardLayout({ children, footerText = 'Fantasy College Football' }: CardLayoutProps) {
  return (
    <div
      style={{
        width: OG.width,
        height: OG.height,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: OG.bgPage,
        fontFamily: 'Inter',
        color: OG.textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 48px',
          borderBottom: `2px solid ${OG.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'Montserrat',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: OG.textPrimary,
          }}
        >
          RIVYLS
        </div>
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 4,
            backgroundColor: OG.gold,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '32px 48px',
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          borderTop: `1px solid ${OG.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            color: OG.textMuted,
          }}
        >
          rivyls.com
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            color: OG.textSecondary,
          }}
        >
          {footerText}
        </div>
      </div>
    </div>
  )
}
