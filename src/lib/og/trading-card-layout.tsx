import { OG } from './constants'

interface TradingCardLayoutProps {
  children: React.ReactNode
  accentColor?: string
  footerText?: string
}

export function TradingCardLayout({
  children,
  accentColor = OG.gold,
  footerText = 'rivyls.com',
}: TradingCardLayoutProps) {
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
        border: `6px solid ${accentColor}`,
      }}
    >
      {/* Gold top strip */}
      <div
        style={{
          display: 'flex',
          height: 8,
          backgroundColor: accentColor,
          width: '100%',
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px 16px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: accentColor,
          }}
        >
          RIVYLS
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            color: OG.textMuted,
            letterSpacing: '0.1em',
          }}
        >
          FANTASY SPORTS
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '0 48px 24px',
        }}
      >
        {children}
      </div>

      {/* Footer + bottom strip */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 48px',
            borderTop: `1px solid ${OG.border}`,
          }}
        >
          <div style={{ display: 'flex', fontSize: 16, color: OG.textMuted }}>
            {footerText}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            height: 8,
            backgroundColor: accentColor,
            width: '100%',
          }}
        />
      </div>
    </div>
  )
}
