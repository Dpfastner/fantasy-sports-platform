import { ImageResponse } from 'next/og'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const fonts = loadFonts()

    return new ImageResponse(
      (
        <CardLayout footerText="rivyls.com">
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 52,
                fontFamily: 'Montserrat',
                fontWeight: 700,
                color: OG.gold,
                marginBottom: 24,
              }}
            >
              Fantasy College Football
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', fontSize: 28, color: OG.textPrimary }}>
                Draft teams. Compete with friends. Win prizes.
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 16,
                  fontSize: 22,
                  color: OG.gold,
                  fontFamily: 'Montserrat',
                  fontWeight: 700,
                }}
              >
                Sign up free at rivyls.com →
              </div>
            </div>
          </div>
        </CardLayout>
      ),
      {
        width: OG.width,
        height: OG.height,
        fonts: [
          { name: 'Montserrat', data: fonts.montserratBold, weight: 700 as const },
          { name: 'Inter', data: fonts.interRegular, weight: 400 as const },
        ],
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : ''
    return new Response(JSON.stringify({ error: message, stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
